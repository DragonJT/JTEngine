
function Emit(parsed){
    var components = parsed.find(p=>p.constructorName == 'Components').body; 
    var library = parsed.find(p=>p.constructorName == 'Library').body;
    var modes = parsed.filter(p=>p.constructorName == 'Mode');
    
    function Function(f){
        code+='function '+f.name.value+'(';
        for(var i=0;i<f.args.length;i++){
            code+=f.args[i].value;
            if(i<f.args.length-1)
                code+=',';
        }
        code+=')\n';
        code+=f.body;
        code+='\n';
    }

    var code = '';
    code+=`
var base = {};
var entities = [];
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
        var modeName = mode.name.value;
        code+='function '+modeName+'(){\n'
        code+='var '+modeName+'={};\n';
        for(var b of mode.body){
            if(b.constructorName == 'Function')
                Function(b);
            else if(b.constructorName == 'Mode')
                Mode(b);
        }
        for(var b of mode.body){
            if(b.constructorName == 'Function')
                code+=modeName+'.'+b.name.value+'='+b.name.value+';\n';
            else if(b.constructorName == 'Mode')
                code+=modeName+'.'+b.name.value+'='+b.name.value+'();\n';
        }
        var awakeFunc = mode.body.find(b=>b.constructorName == 'Function' && b.name.value == 'Awake');
        if(awakeFunc!=undefined)
            code+='Awake();\n';
        code+='return '+modeName+';\n';
        code+='}\n';
    }
    for(var mode of modes){
        Mode(mode);
        code+='base.'+mode.name.value+'='+mode.name.value+'();\n';
    }
    code+=`
Awake();
`;
    return code;
}