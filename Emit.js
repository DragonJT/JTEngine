
function Emit(parsed){
    var components = parsed.find(p=>p.constructorName == 'Components').body; 
    var library = parsed.find(p=>p.constructorName == 'Library').body;
    var modes = parsed.filter(p=>p.constructorName == 'Mode');
    
    function Function(f){
        code+='function '+f.name.value+'(';
        for(var i=0;i<f.args.length;i++){
            code+=f.args[i].value;
            if(i<f.args.length)
                code+=',';
        }
        code+=')\n';
        code+=f.body;
        code+='\n';
    }

    var code = '';
    code+=`
var modes = [];
var g = {};
var entities = [];
var mode=0;
`;
    for(var f of library)
        Function(f);
    for(var c of components){
        code+='function '+c.name.value+'('
        for(var i=0;i<c.body.length;i++){
            code+=c.body[i].name.value;
            if(i<c.body.length-1)
                code+=',';
        }
        code+='){\n';
        code+='var o={}\n';
        code+='o.constructorName='+'"'+c.name.value+'";\n';
        for(var p of c.body){
            code+='o.'+p.name.value+'='+p.name.value+';\n';
        }
        code+='return o;\n';
        code+='}\n';
    }

    function Mode(mode){
        code+='function '+mode.name.value+'(){\n'
        for(var f of mode.body){
            Function(f);
        }
        code+='return {\n';
        for(var f of mode.body){
            code+=f.name.value+':'+f.name.value+',\n';
        }
        code+='};\n';
        code+='}\n';
    }
    for(var mode of modes){
        Mode(mode);
        code+='modes.push('+mode.name.value+'());\n';
    }
    code+=`
function KeyDown(e){
    if(e.key == 'Escape'){
        mode++;
        if(mode>=modes.length)
            mode=0;
        if(modes[mode].Awake!=undefined)
            modes[mode].Awake();
    }
}

function Update(){
    if(modes[mode].Update!=undefined)
        modes[mode].Update();
    requestAnimationFrame(Update);
}
addEventListener('keydown', KeyDown);
if(modes[mode].Awake!=undefined)
    modes[mode].Awake();
Update();
`;
    return code;
}