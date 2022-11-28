function GetContext(){
    var canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.style.border = '0';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    return canvas.getContext('2d');
}

var code = `

Components{
    Transform2D{
        position = Vector2(0,0);
        angle = 0;
        scale = Vector2(20,20);
    }

    Rect{
        color = Color(0,0,1);
    }

    Player{}
}

Library{
    Color(r,g,b){
        return 'rgb('+r*255+','+g*255+','+b*255+')';
    }
    
    Vector2(x,y){
        return {x:x, y:y};
    }
    
    Entity(components){
        var entity = {};
        for(var c of components){
            entity[c.constructorName] = c;
        }
        entities.push(entity);
        return entity;
    }

    Clear(r,g,b){
        ctx.fillStyle = Color(r,g,b);
        ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    }

    DrawRects(){
        for(var e of entities){
            if(e.Rect!=undefined){
                var pos = e.Transform2D.position;
                var scale = e.Transform2D.scale;
                ctx.fillStyle = e.Rect.color;
                ctx.fillRect(pos.x - scale.x/2, pos.y - scale.y/2, scale.x, scale.y);
            }
        }
    }

    MouseDown(e){
        base.mouseDown = true;
        base.startDrag = Vector2(e.clientX, e.clientY);
        CallModeFunction(base, 'MouseDown', [e]);
        CallModeFunction(base, 'BeginDrag', [base.startDrag]);
    }

    MouseUp(e){   
        base.mouseDown = false;     
    }

    MouseMove(e){
        if(base.mouseDown){
            CallModeFunction(base, 'Drag', [base.startDrag, Vector2(e.clientX, e.clientY)]);
        }        
    }

    KeyDown(e){
        CallModeFunction(base, 'KeyDown', [e]);
    }

    Update(){
        base[base.mode].Update();
        requestAnimationFrame(Update);
    }

    Awake(){
        addEventListener('keydown', KeyDown);
        addEventListener('mousedown', MouseDown);
        addEventListener('mousemove', MouseMove);
        addEventListener('mouseup', MouseUp);

        base.mode = 'Editor';
        Update();
    }

    CallModeFunction(obj, funcName, params){
        var func = obj[obj.mode][funcName];
        if(func!=undefined)
            func(...params);
    }
}

mode Editor{
    mode CreateRects{
        BeginDrag(pos){
            CreateRects.current = Entity([
                Transform2D(pos, 0, Vector2(0,0)),
                Rect(Color(0,0,1)),
            ]);
        }
    
        Drag(start, end){
            var center = Vector2((start.x+end.x)/2, (start.y+end.y)/2);
            var scale = Vector2(end.x-start.x, end.y-start.y);
            CreateRects.current.Transform2D.position = center;
            CreateRects.current.Transform2D.scale = scale;
        }

        KeyDown(e){
            if(e.key == 'Tab'){
                Editor.mode = 'CreatePlayer';
                e.preventDefault();
            }
        }
    }

    mode CreatePlayer{
        MouseDown(e){
            Entity([
                Transform2D(Vector2(e.clientX, e.clientY), 0, Vector2(30,80)),
                Rect(Color(1,0,0)),
                Player(),
            ]);
        }

        KeyDown(e){
            if(e.key == 'Tab'){
                Editor.mode = 'CreateRects';
                e.preventDefault();
            }
        }
    }

    Awake(){
        Editor.mode = 'CreateRects';
    }

    Update(){
        Clear(0,0,0);
        DrawRects();
    }

    MouseDown(e){
        CallModeFunction(Editor, 'MouseDown', [e]);
    }

    BeginDrag(pos){
        CallModeFunction(Editor, 'BeginDrag', [pos]);
    }

    Drag(start, end){
        CallModeFunction(Editor, 'Drag', [start, end]);
    }

    KeyDown(e){
        CallModeFunction(Editor, 'KeyDown', [e]);
        if(e.key == 'Escape')
            base.mode = 'Game';
    }
}

mode Game{
    Update(){
        Clear(0,0,0);
        DrawRects();
    }

    KeyDown(e){
        if(e.key == 'Escape')
            base.mode = 'Editor';
    }
}
`;

function JSTokenizer(code){
    var tokenizer = new Tokenizer();
    var digit = new TkCharRange('0', '9');
    var character = new TkOr([new TkCharRange('a', 'z'), new TkCharRange('A', 'Z'), new TkString('_')]);
    var alphaNumeric = new TkOr([character, digit]);
    var integer = new TkWhile(digit, 1);
    var float = new TkObject([new TkWhile(digit, 1), new TkString('.'), new TkWhile(digit, 0)]);
    tokenizer.AddLiterals(['<=','>=','!=','+','-','*','/','(',')','=',';','.','{','}','(',')',',','<','>','[',']','!',':']);
    tokenizer.Add('Whitespace', new TkOr([new TkString(' '), new TkString('\n'), new TkString('\t'), new TkString('\r')]), false);
    tokenizer.Add('Number', new TkOr([float, integer]));
    tokenizer.Add('String', new TkOr([new TkQuote('"'), new TkQuote("'"), new TkQuote('`')]));
    tokenizer.Add('Identifier', new TkObject([character, new TkWhile(alphaNumeric, 0)]), true, 
        new Set(['Components', 'StartupSystems', 'Systems', 'Library', 'mode']));
    var tokens = tokenizer.Tokenize(code);

    var value = new PsCircular();
    var call = new PsObject('Type');
    call.Add('name', new PsToken('Identifier'));
    call.Add('params', new PsDecoratedValue([new PsToken('('), new PsWhileWithDeliminator(value, ','), new PsToken(')')], 1));

    value.parser = new PsOr([call, new PsToken('Number')]);

    var field = new PsObject('Field');
    field.Add('name', new PsToken('Identifier'));
    field.AddLiteral('=');
    field.Add('value', value);
    field.AddLiteral(';');

    var component = new PsObject('Component');
    component.Add('name', new PsToken('Identifier'));
    component.Add('body', new PsDecoratedValue([new PsToken('{'), new PsWhile(field, 0), new PsToken('}')], 1));

    var components = new PsObject('Components');
    components.AddLiteral('Components');
    components.Add('body', new PsDecoratedValue([new PsToken('{'), new PsWhile(component, 0), new PsToken('}')], 1));

    var args =  new PsDecoratedValue([new PsToken('('), new PsWhileWithDeliminator(new PsToken('Identifier'), ','), new PsToken(')')], 1);
    var func = new PsObject('Function');
    func.Add('name', new PsToken('Identifier'));
    func.Add('args', args);
    func.Add('body', new PsBlock('{', '}'));

    var library = new PsObject('Library');
    library.AddLiteral('Library');
    library.Add('body', new PsDecoratedValue([new PsToken('{'), new PsWhile(func, 0), new PsToken('}')], 1));

    var mode = new PsObject('Mode');
    mode.AddLiteral('mode');
    mode.Add('name', new PsToken('Identifier'));
    mode.Add('body', new PsDecoratedValue([new PsToken('{'), new PsWhile(new PsOr([mode, func]), 0), new PsToken('}')], 1));

    var core = new PsWhile(new PsOr([library, components, mode]), 0);
    var compileUnit = core;
    var reader = new TokenReader(tokens, code);
    var p = compileUnit.Parse(reader);

    var furthestToken = reader.value[reader.furthest];
    if(furthestToken != undefined){
        console.log('ERROR');
        console.log(furthestToken);
        console.log(code.substring(0, furthestToken.start)+'-->|'+code.substring(furthestToken.start));
    }
    else{
        var emittedCode = Emit(p);
        console.log(emittedCode);
        new Function('ctx', emittedCode)(ctx);
    }
}

var ctx = GetContext();
JSTokenizer(code);
