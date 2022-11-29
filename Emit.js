
function Emit(parsed){
    var components = parsed.filter(p=>p.constructorName == 'Component'); 
    var functions = parsed.filter(p=>p.constructorName == 'Function');
    var modules = parsed.filter(p=>p.constructorName == 'Module');
    
    function Args(f){
        code+='(';
        for(var i=0;i<f.args.length;i++){
            code+=f.args[i].value;
            if(i<f.args.length-1)
                code+=',';
        }
        code+=')\n';
    }

    function Function(f){
        code+='function '+f.name.value;
        Args(f);
        code+=f.body;
        code+='\n';
    }

    function Functions(funcs){
        for(var f of funcs){
            code+='function '+f.name.value;
            Args(f);
            code+=f.body;
            code+='\n';
        }
    }

    var code = '';
    code+=`
var base = {};
var entities = [];
`;
    for(var f of functions)
        Function(f);
    for(var c of components){
        var fields = c.body.filter(b=>b.constructorName == 'Field');
        var funcs = c.body.filter(f=>f.constructorName == 'Function');
        code+='var '+c.name.value+'=function(){\n';
        code+='function Create('
        for(var i=0;i<fields.length;i++){
            code+=fields[i].name.value;
            if(i<fields.length-1)
                code+=',';
        }
        code+='){\n';
        code+='return {\n';
        code+='constructorName:'+'"'+c.name.value+'",\n';
        for(var f of fields){
            code+=f.name.value+':'+f.name.value+',\n';
        }
        code+='};\n';
        code+='}\n';
        Functions(funcs);

        code+='return {\n'
        code+='Create:Create,\n';
        for(var f of funcs){
            code+=f.name.value+':'+f.name.value+',\n';
        }
        code+='}}();\n';
    }

    for(var m of modules){
        var funcs = m.body.filter(f=>f.constructorName == 'Function');
        code+='var '+m.name.value+'=function(){\n';
        Functions(funcs);
        code+='return {\n';
        for(var f of funcs){
            code+=f.name.value+':'+f.name.value+',\n';
        }
        code+='}}();\n';
    }
    code+=`
Awake();
`;
    return code;
}