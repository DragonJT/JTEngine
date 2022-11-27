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

    Rigidbody2D{
        velocity = Vector2(0,0);
    }

    Rect{
        color = Color(0,0,1);
    }

    StayOnScreen{}
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
    }

    CreateRocks(count, size){
        for(var i=0;i<count;i++){
            Entity([
                Transform2D(Vector2(Math.random()*ctx.canvas.width, Math.random()*ctx.canvas.height), 0, Vector2(Math.random()*size-size/2, Math.random()*size-size/2)),
                Rigidbody2D(Vector2(Math.random()*2-1, Math.random()*2-1)),
                Rect(Color(Math.random(), Math.random(), Math.random())),
                StayOnScreen(),
            ]);
        }
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
}

mode Editor{
    Awake(){
        CreateRocks(50, 100);
    }

    Update(){
        Clear(0,0,0);
        DrawRects();
    }
}

mode Game{
    Rigidbody2D(){
        for(var e of entities){
            if(e.Rigidbody2D!=undefined){
                var pos = e.Transform2D.position;
                pos.x += e.Rigidbody2D.velocity.x;
                pos.y += e.Rigidbody2D.velocity.y;
            }
        }
    }

    StayOnScreen(){
        for(var e of entities){
            if(e.StayOnScreen!=undefined){
                var pos = e.Transform2D.position;
                if(pos.x<0)
                    pos.x+=ctx.canvas.width;
                if(pos.x>ctx.canvas.width)
                    pos.x-=ctx.canvas.width;
                if(pos.y<0)
                    pos.y+=ctx.canvas.height;
                if(pos.y>ctx.canvas.height)
                    pos.y-=ctx.canvas.height;
            }
        }
    }

    Update(){
        Clear(0,0,0.5);
        Rigidbody2D();
        StayOnScreen();
        DrawRects();
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
    mode.Add('body', new PsDecoratedValue([new PsToken('{'), new PsWhile(func, 0), new PsToken('}')], 1));

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
