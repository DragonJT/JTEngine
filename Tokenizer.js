class CodeReader{
    constructor(value){
        this.value = value;
        this.index = 0;
    }

    OutOfRange(){
        return this.index>=this.value.length;
    }

    Current(){
        return this.value[this.index];
    }

    MoveNext(){
        this.index++;
    }
}

class TkString{
    constructor(str){
        this.str = str;
    }

    Tokenize(reader){
        for(var c of this.str){
            if(reader.OutOfRange())
                return false;
            if(reader.Current() != c)
                return false;
            reader.MoveNext();
        }
        return true;
    }
}

class TkCharRange{
    constructor(min, max){
        this.min = min;
        this.max = max;
    }

    Tokenize(reader){
        if(reader.OutOfRange())
            return false;
        var current = reader.Current();
        if(current>=this.min && current<=this.max){
            reader.MoveNext();
            return true;
        }
        return false;
    }
}

class TkOr{
    constructor(branches){
        this.branches = branches;
    }

    Tokenize(reader){
        var index = reader.index;
        for(var b of this.branches){
            reader.index = index;
            if(b.Tokenize(reader))
                return true;
        }
        return false;
    }
}

class TkObject{
    constructor(fields){
        this.fields = fields;
    }

    Tokenize(reader){
        for(var f of this.fields){
            if(!f.Tokenize(reader))
                return false;
        }
        return true;
    }
}

class TkWhile{
    constructor(element, minLength){
        this.element = element;
        this.minLength = minLength;
    }

    Tokenize(reader){
        var length = 0;
        while(this.element.Tokenize(reader)){
            length++;
        }
        return length>=this.minLength;
    }
}

class TkQuote{
    constructor(ends){
        this.ends = ends;
    }

    Tokenize(reader){
        if(reader.OutOfRange())
            return false;
        if(reader.Current() != this.ends)
            return false;
        reader.MoveNext();
        while(true){
            if(reader.OutOfRange())
                return false;
            if(reader.Current() == this.ends){
                reader.MoveNext();
                return true;
            }
            reader.MoveNext();
        }
    }
}

class Tokenizer{
    constructor(){
        this.tokenizers = [];
    }

    Add(name, tokenizer, save=true, literalSet){
        this.tokenizers.push({name:name, tokenizer:tokenizer, save:save, literalSet:literalSet});
    }

    AddLiterals(literals){
        for(var l of literals){
            this.tokenizers.push({name:l, tokenizer:new TkString(l), save:true});
        }
    }

    GetNextToken(reader){
        var index = reader.index;
        for(var t of this.tokenizers){
            reader.index = index;
            if(t.tokenizer.Tokenize(reader)){
                if(!t.save)
                    return undefined;
                if(t.literalSet!=undefined){
                    var str = reader.value.substring(index, reader.index);
                    if(t.literalSet.has(str))
                        return {name:str, value:str, start:index, end:reader.index};
                    return {name:t.name, value:str, start:index, end:reader.index};
                }
                return {name:t.name, value:reader.value.substring(index, reader.index), start:index, end:reader.index};
            }
        }   
        throw "No matching tokens"+reader.value.substring(0, index)+'-->|'+reader.value.substring(index);    
    }

    Tokenize(code){
        var reader = new CodeReader(code);
        var tokens = [];
        while(true){
            if(reader.OutOfRange())
                return tokens;
            var token = this.GetNextToken(reader);
            if(token!=undefined)
                tokens.push(token);
        }
    }
}