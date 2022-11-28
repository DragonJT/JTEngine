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

    Player{
        moveSpeed = 5;
        jumpSpeed = 10;
        gravity = 0.2;
        velocityY = 0;
        grounded=false;
    }

    RectCollider{}
}

Library{
    LoadFile(func) {
        readFile = function(e) {
            var file = e.target.files[0];
            if (!file) {
                return;
            }
            var reader = new FileReader();
            reader.onload = function(e) {
                var contents = e.target.result;
                fileInput.func(contents)
                document.body.removeChild(fileInput)
            }
            reader.readAsText(file)
        }
        var fileInput = document.createElement("input")
        fileInput.type='file'
        fileInput.style.display='none'
        fileInput.onchange=readFile
        fileInput.func=func
        document.body.appendChild(fileInput)
        fileInput.click();
    }

    SaveFile(name, data){
        const file = new File([data], name, {
            type: 'text/plain',
        });
          
        const link = document.createElement('a');
        const url = URL.createObjectURL(file);
        
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
    
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

    OnMouseDown(e){
        base.mouseDown = true;
        base.startDrag = Vector2(e.clientX, e.clientY);
        CallModeFunction(base, 'OnMouseDown', [e]);
        CallModeFunction(base, 'OnBeginDrag', [base.startDrag]);
    }

    GetEntityWithComponent(type){
        for(var e of entities){
            if(e[type]!=undefined)
                return e;
        }
        return undefined;
    }

    OnMouseUp(e){   
        base.mouseDown = false;     
    }

    OnMouseMove(e){
        if(base.mouseDown){
            CallModeFunction(base, 'OnDrag', [base.startDrag, Vector2(e.clientX, e.clientY)]);
        }        
    }

    GetKey(key){
        return base.input.keys.has(key);
    }

    OnKeyDown(e){
        base.input.keys.add(e.key);
        CallModeFunction(base, 'OnKeyDown', [e]);
    }

    OnKeyUp(e){
        CallModeFunction(base, 'OnKeyUp', [e]);
        base.input.keys.delete(e.key);
    }

    Update(){
        CallModeFunction(base, 'Update', []);
        requestAnimationFrame(Update);
    }

    Awake(){
        addEventListener('keydown', OnKeyDown);
        addEventListener('keyup', OnKeyUp);
        addEventListener('mousedown', OnMouseDown);
        addEventListener('mousemove', OnMouseMove);
        addEventListener('mouseup', OnMouseUp);

        base.input = {};
        base.input.keys = new Set();
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
        OnBeginDrag(pos){
            CreateRects.current = Entity([
                Transform2D(pos, 0, Vector2(0,0)),
                Rect(Color(0,0,1)),
                RectCollider(),
            ]);
        }
    
        OnDrag(start, end){
            var center = Vector2((start.x+end.x)/2, (start.y+end.y)/2);
            var scale = Vector2(Math.abs(end.x-start.x), Math.abs(end.y-start.y));
            CreateRects.current.Transform2D.position = center;
            CreateRects.current.Transform2D.scale = scale;
        }

        OnKeyDown(e){
            if(e.key == 'Tab'){
                Editor.mode = 'CreatePlayer';
                e.preventDefault();
            }
        }
    }

    mode CreatePlayer{
        OnMouseDown(e){
            Entity([
                Transform2D(Vector2(e.clientX, e.clientY), 0, Vector2(30,80)),
                Rect(Color(1,0,0)),
                Player(5,10,0.2,0,false),
            ]);
        }

        OnKeyDown(e){
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

    OnMouseDown(e){
        CallModeFunction(Editor, 'OnMouseDown', [e]);
    }

    OnBeginDrag(pos){
        CallModeFunction(Editor, 'OnBeginDrag', [pos]);
    }

    OnDrag(start, end){
        CallModeFunction(Editor, 'OnDrag', [start, end]);
    }

    OnKeyDown(e){
        CallModeFunction(Editor, 'OnKeyDown', [e]);
        if(e.key == 'Escape'){
            base.mode = 'Game';
            base.saveData = JSON.stringify(entities);
        }
        if(e.key == 's')
            SaveFile('jtsave.txt', JSON.stringify(entities));
        if(e.key == 'l')
            LoadFile(c=>{entities = JSON.parse(c);});
    }
}

mode Game{

    RectCollision(posA, scaleA, posB, scaleB){
        var distx = Math.abs(posB.x - posA.x);
        var disty = Math.abs(posB.y - posA.y);
        var minx = (scaleA.x + scaleB.x)/2;
        var miny = (scaleA.y + scaleB.y)/2;
        return distx<minx && disty<miny;
    }

    Move(transform, deltaX, deltaY){
        var pos = Vector2(transform.position.x+deltaX, transform.position.y+deltaY);
        for(var e of entities){
            if(e.RectCollider!=undefined){
                if(RectCollision(pos, transform.scale, e.Transform2D.position, e.Transform2D.scale)){
                    return true;
                }
            }
        }
        transform.position = pos;
        return false;
    }

    PlayerMove(){
        var player = GetEntityWithComponent('Player');
        if(player==undefined)
            return;
        var moveX = 0;
        if(GetKey('ArrowRight'))
            moveX+=player.Player.moveSpeed;
        if(GetKey('ArrowLeft'))
            moveX-=player.Player.moveSpeed;
        Move(player.Transform2D, moveX, 0);

        player.Player.velocityY+=player.Player.gravity;
        if(GetKey('ArrowUp') && player.Player.grounded){
            player.Player.velocityY-=player.Player.jumpSpeed;
            player.Player.grounded=false;
        }
        if(player.Player.grounded)
            player.Player.velocityY=0;
        player.Player.grounded = Move(player.Transform2D, 0, player.Player.velocityY);
    }

    Update(){
        Clear(0,0,0);
        PlayerMove();
        DrawRects();
    }

    OnKeyDown(e){
        if(e.key == 'Escape'){
            base.mode = 'Editor';
            entities = JSON.parse(base.saveData);
        }
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
    tokenizer.AddLiterals(['==','&&','||','<=','>=','!=','+','-','*','/','(',')','=',';','.','{','}','(',')',',','<','>','[',']','!',':']);
    tokenizer.Add('Whitespace', new TkOr([new TkString(' '), new TkString('\n'), new TkString('\t'), new TkString('\r')]), false);
    tokenizer.Add('Number', new TkOr([float, integer]));
    tokenizer.Add('String', new TkOr([new TkQuote('"'), new TkQuote("'"), new TkQuote('`')]));
    tokenizer.Add('Identifier', new TkObject([character, new TkWhile(alphaNumeric, 0)]), true, 
        new Set(['Components', 'StartupSystems', 'Systems', 'Library', 'mode', 'true', 'false']));
    var tokens = tokenizer.Tokenize(code);

    var value = new PsCircular();
    var call = new PsObject('Type');
    call.Add('name', new PsToken('Identifier'));
    call.Add('params', new PsDecoratedValue([new PsToken('('), new PsWhileWithDeliminator(value, ','), new PsToken(')')], 1));

    var bool = new PsOr([new PsToken('true'), new PsToken('false')]);
    value.parser = new PsOr([call, new PsToken('Number'), bool]);

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
