

var code = `

component Transform2D{
    position = Vector2(0,0);
    angle = 0;
    scale = Vector2(20,20);

    DrawHandle(transform, dirX, dirY, radius){
        var x = transform.position.x - transform.scale.x/2*dirX;
        var y = transform.position.y - transform.scale.y/2*dirY;
        var ctx = Core.ctx;
        ctx.fillStyle = Color(1,0.5,0);
        if(Editor.selectedHandle!=undefined && Editor.selectedHandle.transform == transform && Editor.selectedHandle.dirX == dirX && Editor.selectedHandle.dirY == dirY)
            ctx.fillStyle = 'blue';
        ctx.fillRect(x-radius, y-radius, radius*2, radius*2);
        ctx.strokeStyle = Color(1,0.5,0);
        ctx.lineWidth = 2;
        ctx.strokeRect(x-radius, y-radius, radius*2, radius*2);
    }

    Draw(){
        var ctx = Core.ctx;
        for(var e of Editor.selected){
            ctx.strokeStyle = Color(1,0.5,0);
            ctx.lineWidth = 2;
            var pos = e.Transform2D.position;
            var scale = e.Transform2D.scale;
            ctx.strokeRect(pos.x - scale.x/2, pos.y - scale.y/2, scale.x, scale.y);
            DrawHandle(e.Transform2D, -1, -1, 6);
            DrawHandle(e.Transform2D, 1, -1, 6);
            DrawHandle(e.Transform2D, 1, 1, 6);
            DrawHandle(e.Transform2D, -1, 1, 6);
        }
    }

    SelectHandle(pos, transform, dirX, dirY, radius){
        var x = transform.position.x - transform.scale.x/2*dirX;
        var y = transform.position.y - transform.scale.y/2*dirY;
        if(Library.RectCollision(Vector2(x,y), Vector2(radius*2, radius*2), pos, Vector2(0,0)))
            Editor.selectedHandle = {transform:transform, dirX:dirX, dirY:dirY, transformScale:transform.scale, transformPosition:transform.position}
    }

    IsOver(pos){
        for(var e of Editor.selected){
            if(Library.RectCollision(e.Transform2D.position, e.Transform2D.scale, pos, Vector2(0,0)))
                return true;
        }
        return false;
    }

    OnBeginDrag(pos){
        for(var e of Editor.selected){
            SelectHandle(pos, e.Transform2D, -1, -1, 6);
            SelectHandle(pos, e.Transform2D, 1, -1, 6);
            SelectHandle(pos, e.Transform2D, 1, 1, 6);
            SelectHandle(pos, e.Transform2D, -1, 1, 6);
        }
        if(Editor.selectedHandle==undefined){
            Editor.translate = {lastPos:pos};
            if(IsOver(pos)){
                return;
            }
            Editor.selected = [];
            for(var i=entities.length-1;i>=0;i--){
                var e = entities[i];
                if(Library.RectCollision(e.Transform2D.position, e.Transform2D.scale, pos, Vector2(0,0))){
                    Editor.selected.push(e);
                }
            }
        }
    }

    OnDrag(start, pos){
        if(Editor.selectedHandle!=undefined){
            var s = Editor.selectedHandle.transformScale;
            var p = Editor.selectedHandle.transformPosition;
            var dirX = Editor.selectedHandle.dirX;
            var dirY = Editor.selectedHandle.dirY;
            var x = p.x + s.x/2*dirX;
            var y = p.y + s.y/2*dirY;
            var centerX = (x+pos.x)/2;
            var centerY = (y+pos.y)/2;
            var scaleX = Math.abs(pos.x - x);
            var scaleY = Math.abs(pos.y - y);
            Editor.selectedHandle.transform.position = Vector2(centerX, centerY);
            Editor.selectedHandle.transform.scale = Vector2(scaleX, scaleY);
        }
        if(Editor.translate!=undefined){
            var deltaX = pos.x - Editor.translate.lastPos.x;
            var deltaY = pos.y - Editor.translate.lastPos.y;
            for(var e of Editor.selected){
                e.Transform2D.position = Vector2(e.Transform2D.position.x+deltaX, e.Transform2D.position.y+deltaY);
            }
            Editor.translate.lastPos = pos;
        }
    }

    OnEndDrag(pos){
        Editor.selectedHandle = undefined;
        Editor.translate = undefined;
    }

    OnKeyDown(e){
        if(e.key == 'd')
            Duplicate();
        if(e.key == 'Backspace')
            Delete();
    }
}

component Rect{
    color = Color(0,0,1);

    Draw(){
        var ctx = Core.ctx;
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

component Player{
    moveSpeed = 5;
    jumpSpeed = 10;
    gravity = 0.2;
    velocityY = 0;
    grounded=false;

    Update(){
        var player = Entity.WithComponent('Player');
        if(player==undefined)
            return;
        var moveX = 0;
        if(Core.GetKey('ArrowRight'))
            moveX+=player.Player.moveSpeed;
        if(Core.GetKey('ArrowLeft'))
            moveX-=player.Player.moveSpeed;
        RectCollider.Move(player.Transform2D, moveX, 0);

        player.Player.velocityY+=player.Player.gravity;
        if(Core.GetKey('ArrowUp') && player.Player.grounded){
            player.Player.velocityY-=player.Player.jumpSpeed;
            player.Player.grounded=false;
        }
        player.Player.grounded=false;
        if(RectCollider.Move(player.Transform2D, 0, player.Player.velocityY)){
            if(player.Player.velocityY>0)
                player.Player.grounded=true;
            player.Player.velocityY=0;
        }
    }
}

component RectCollider{

    Move(transform, deltaX, deltaY){
        var pos = Vector2(transform.position.x+deltaX, transform.position.y+deltaY);
        for(var e of entities){
            if(e.RectCollider!=undefined){
                if(Library.RectCollision(pos, transform.scale, e.Transform2D.position, e.Transform2D.scale)){
                    return true;
                }
            }
        }
        transform.position = pos;
        return false;
    }
}

module Library{
    Button(parent, name, onclick){
        var button = document.createElement('button');
        parent.appendChild(button);
        button.innerHTML = name;
        button.onclick = onclick
        return button;
    }

    Div(parent){
        var div = document.createElement('div');
        parent.appendChild(div);
        return div;
    }
    
    DivButton(parent, name, onclick){
        var div = Div(parent);
        var button = Button(div, name, onclick);
        return button;
    }

    GetContext(parent){
        var div= Div(parent);
        var canvas = document.createElement('canvas');
        div.appendChild(canvas)
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        parent.style.border = '0';
        parent.style.margin = '0';
        parent.style.overflow = 'hidden';
        return canvas.getContext('2d');
    }
    
    RemoveFromArray(array, item){
        const index = array.indexOf(item);
        if (index > -1)
            array.splice(index, 1);
    }

    RectCollision(posA, scaleA, posB, scaleB){
        var distx = Math.abs(posB.x - posA.x);
        var disty = Math.abs(posB.y - posA.y);
        var minx = (scaleA.x + scaleB.x)/2;
        var miny = (scaleA.y + scaleB.y)/2;
        return distx<minx && disty<miny;
    }

    Clear(r,g,b){
        var ctx=Core.ctx;
        ctx.fillStyle = Color(r,g,b);
        ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    }    
}

module Menu{
    ItemButton(div, name, onclick){
        Library.DivButton(div, name, ()=>{
            onclick();
            document.body.removeChild(div);
        });
    }

    Dropdown(position, menuItems){
        var div = Library.Div(document.body);
        div.style.position = 'absolute';
        div.style.left = position.x+'px';
        div.style.top = position.y+'px';
        for(var i of menuItems){
            ItemButton(div, i.name, i.onclick);
        }
    }

    FindPos(obj){
        var curleft = 0;
        var curtop = 0;
        
        if (obj.offsetParent) {
            do {
                curleft += obj.offsetLeft;
                curtop += obj.offsetTop;
            } while (obj = obj.offsetParent);
        
            return Vector2(curleft, curtop);
        }
    }

    Item(name, onclick){
        return {name:name, onclick:onclick};
    }

    Button(parent, name, menuItems){
        var button = Library.Button(parent, name, ()=>{
            var pos = FindPos(button);
            pos.y += button.offsetHeight;
            Dropdown(pos, menuItems);
        });
    }
}

Color(r,g,b){
    return 'rgb('+r*255+','+g*255+','+b*255+')';
}

Vector2(x,y){
    return {x:x, y:y};
}

module Entity{
    Create(components){
        var entity = {};
        for(var c of components){
            entity[c.constructorName] = c;
        }
        entities.push(entity);
        return entity;
    }
    
    WithComponent(type){
        for(var e of entities){
            if(e[type]!=undefined)
                return e;
        }
        return undefined;
    }

    CreatePlayer(){
        var e = Create([
            Transform2D.Create(Vector2(Core.ctx.canvas.width/2, Core.ctx.canvas.height/2), 0, Vector2(30,70)),
            Rect.Create(Color(1,0,0)),
            Player.Create(5,10,0.2,0,false),
        ]);
        Editor.selected = [e];
    }

    CreateRect(){
        var e = Create([
            Transform2D.Create(Vector2(Core.ctx.canvas.width/2, Core.ctx.canvas.height/2), 0, Vector2(100,100)),
            Rect.Create(Color(0,0,1)),
            RectCollider.Create(),
        ]);
        Editor.selected = [e];
    }
}

module Core{
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

    GetMousePos(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return Vector2(e.clientX - rect.left, e.clientY - rect.top);
    }

    OnMouseDown(e){
        Core.mouseDown = true;
        var mousePos = GetMousePos(Core.ctx.canvas, e);
        Core.startDrag = mousePos;
        if(Core.mode.OnMouseDown) Core.mode.OnMouseDown(mousePos);
        if(Core.mode.OnBeginDrag) Core.mode.OnBeginDrag(mousePos);
    }

    OnMouseUp(e){   
        Core.mouseDown = false; 
        var mousePos = GetMousePos(Core.ctx.canvas, e);
        if(Core.mode.OnEndDrag) Core.mode.OnEndDrag(mousePos);
    }

    OnMouseMove(e){
        if(Core.mouseDown){
            var mousePos = GetMousePos(Core.ctx.canvas, e);
            if(Core.mode.OnDrag) Core.mode.OnDrag(Core.startDrag, mousePos);
        }        
    }

    GetKey(key){
        return Core.input.keys.has(key);
    }

    OnKeyDown(e){
        Core.input.keys.add(e.key);
        if(Core.mode.OnKeyDown) Core.mode.OnKeyDown(e);
    }

    OnKeyUp(e){
        if(Core.mode.OnKeyUp) Core.mode.OnKeyUp(e);
        Core.input.keys.delete(e.key);
    }

    Update(){
        if(Core.mode.Update) Core.mode.Update();
        requestAnimationFrame(Update);
    }

    RunButton(){
        if(Core.mode == Editor){
            Core.runButton.innerHTML = 'x';
            Core.mode = Game;
            Core.saveData = JSON.stringify(entities);
        }
        else{
            Core.runButton.innerHTML = '>';
            Core.mode = Editor;
            entities = JSON.parse(Core.saveData);
        }
    }

    Save(){
        SaveFile('jtsave.txt', JSON.stringify(entities));
    }

    Load(){
        LoadFile(c=>{entities = JSON.parse(c);});
    }

    Clear(){
        entities = [];
    }

    Awake(){
        Core.menu = Library.Div(document.body);
        Menu.Button(Core.menu, 'File', [Menu.Item('Load',Load), Menu.Item('Save',Save), Menu.Item('Clear', Clear)]);
        Menu.Button(Core.menu, 'Add', [Menu.Item('Rect', Entity.CreateRect), Menu.Item('Player', Entity.CreatePlayer)])
        Core.runButton = Library.Button(Core.menu, '>', RunButton);
        Core.ctx = Library.GetContext(document.body);
        addEventListener('keydown', OnKeyDown);
        addEventListener('keyup', OnKeyUp);
        addEventListener('mousedown', OnMouseDown);
        addEventListener('mousemove', OnMouseMove);
        addEventListener('mouseup', OnMouseUp);

        Core.mode = Editor;
        Core.input = {};
        Core.input.keys = new Set();
        Editor.selected = [];
        Update();
    }
}

Awake(){
    Core.Awake();
}

module Editor{
    Duplicate(){
        var selected = [];
        for(var e of Editor.selected){
            var newEntity = JSON.parse(JSON.stringify(e));
            entities.push(newEntity);
            selected.push(newEntity);
        }
        Editor.selected = selected;
    }

    Delete(){
        for(var e of Editor.selected){
            RemoveFromArray(entities, e);
        }
        Editor.selected = [];
    }

    OnBeginDrag(pos){
        Transform2D.OnBeginDrag(pos);
    }

    OnDrag(start, pos){
        Transform2D.OnDrag(start, pos);
    }

    OnEndDrag(pos){
        Transform2D.OnEndDrag(pos);
    }

    OnKeyDown(e){
        if(e.key == 'd')
            Duplicate();
        if(e.key == 'Backspace')
            Delete();
    }

    Update(){
        Library.Clear(0,0,0);
        Rect.Draw();
        Transform2D.Draw();
    }
}

module Game{
    Update(){
        Library.Clear(0,0,0);
        Player.Update();
        Rect.Draw();
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
        new Set(['component', 'module', 'true', 'false']));
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

    var args =  new PsDecoratedValue([new PsToken('('), new PsWhileWithDeliminator(new PsToken('Identifier'), ','), new PsToken(')')], 1);
    var func = new PsObject('Function');
    func.Add('name', new PsToken('Identifier'));
    func.Add('args', args);
    func.Add('body', new PsBlock('{', '}'));

    var module = new PsObject('Module');
    module.AddLiteral('module');
    module.Add('name', new PsToken('Identifier'));
    module.Add('body', new PsDecoratedValue([new PsToken('{'), new PsWhile(new PsOr([func]), 0), new PsToken('}')], 1));

    var component = new PsObject('Component');
    component.AddLiteral('component');
    component.Add('name', new PsToken('Identifier'));
    component.Add('body', new PsDecoratedValue([new PsToken('{'), new PsWhile(new PsOr([field, func]), 0), new PsToken('}')], 1));

    var core = new PsWhile(new PsOr([component, module, func]), 0);
    var compileUnit = core;
    var reader = new TokenReader(tokens, code);
    var p = compileUnit.Parse(reader);

    var furthestToken = reader.value[reader.furthest];
    if(furthestToken != undefined){
        alert('ERROR');
        console.log(furthestToken);
        console.log(code.substring(0, furthestToken.start)+'-->|'+code.substring(furthestToken.start));
    }
    else{
        var emittedCode = Emit(p);
        console.log(emittedCode);
        new Function(emittedCode)();
    }
}

JSTokenizer(code);
