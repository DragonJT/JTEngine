class TokenReader{
    constructor(value, code){
        this.value = value;
        this.code = code;
        this.index = 0;
        this.furthest = 0;
    }

    OutOfRange(){
        return this.index>=this.value.length;
    }

    Current(){
        return this.value[this.index];
    }

    MoveNext(){
        this.index++;
        if(this.index>this.furthest)
            this.furthest = this.index;
    }
}

class PsError{
    constructor(msg){
        this.msg = msg;
    }
}

function IsError(obj){
    return obj.constructor.name == "PsError";
}

class PsToken{
    constructor(name){
        this.name = name;
    }

    Parse(reader){
        if(reader.OutOfRange())
            return new PsError("OutOfRange");
        var current = reader.Current();
        if(current.name == this.name){
            reader.MoveNext();
            return current;
        }
        return new PsError("TokenDoesntMatch");
    }
}

class PsWhile{
    constructor(element, minLength){
        this.element = element;
        this.minLength = minLength;
    }

    Parse(reader){
        var array = [];
        while(true){
            var p = this.element.Parse(reader);
            if(IsError(p)){
                if(array.length>=this.minLength){
                    return array;
                }
                return new PsError("ArrayNotLongEnough");
            }
            array.push(p);
        }
    }
}

class PsWhileWithDeliminator{
    constructor(element, deliminator){
        this.element = element;
        this.deliminator = deliminator;
    }

    Parse(reader){
        var array = [];
        var p = this.element.Parse(reader);
        if(IsError(p))
            return array;
        array.push(p);
        while(true){
            if(reader.OutOfRange())
                return array;
            var current = reader.Current();
            if(current.name == this.deliminator)
                reader.MoveNext();
            else
                return array;

            p = this.element.Parse(reader);
            if(IsError(p)){
                return new PsError("ArrayNotLongEnough");
            }
            array.push(p);
        }
    }
}

class PsDecoratedValue{
    constructor(fields, id){
        this.fields = fields;
        this.id = id;
    }

    Parse(reader){
        for(var i=0;i<this.id;i++){
            var p = this.fields[i].Parse(reader);
            if(IsError(p))
                return p;
        }
        var result=this.fields[this.id].Parse(reader);
        if(IsError(result))
            return result;
        for(var i=this.id+1;i<this.fields.length;i++){
            var p = this.fields[i].Parse(reader);
            if(IsError(p))
                return p;
        }
        return result;
    }
}

class PsOr{
    constructor(branches){
        this.branches = branches;
    }

    Parse(reader){
        var index = reader.index;
        for(var b of this.branches){
            reader.index = index;
            var p = b.Parse(reader);
            if(!IsError(p)){
                return p;
            }
        }
        return new PsError("NoBranchesMatch");
    }
}

class PsObject{
    constructor(name){
        this.name = name;
        this.fields = [];
    }

    AddLiteral(literal){
        this.fields.push({parser:new PsToken(literal)});
    }

    Add(name, parser){
        this.fields.push({name:name, parser:parser});
    }

    Parse(reader){
        var obj = {constructorName:this.name};
        for(var f of this.fields){
            var p = f.parser.Parse(reader);
            if(IsError(p))
                return p;
            if(f.name != undefined)
                obj[f.name] = p;
        }
        return obj;
    }
}

class PsCircular{
    Parse(reader){
        return this.parser.Parse(reader);
    }
}

class PsBlock{
    constructor(start, end){
        this.start = start;
        this.end = end;
    }

    Parse(reader){
        var indent = 0;
        if(reader.OutOfRange())
            return new PsError("OutOfRange");
        var current = reader.Current();
        var start = current.start;
        if(current.name == this.start){
            reader.MoveNext();
            indent++;
        }else
            return new PsError("TokenDoesntMatch");
        while(true){
            if(reader.OutOfRange())
                return new PsError("OutOfRange");
            var current = reader.Current();
            if(current.name == this.start){
                reader.MoveNext();
                indent++;
            }
            else if(current.name == this.end){
                reader.MoveNext();
                indent--;
                if(indent<=0){
                    var end = current.end;
                    return reader.code.substring(start, end);
                }
            }
            else
                reader.MoveNext();
        }
    }
}