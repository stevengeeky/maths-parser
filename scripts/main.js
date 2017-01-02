var inp, display, qs = ["", ""], tind = 1,
    parser = new Parser();

window.onload = function(e)
{
    inp = document.getElementById("query");
    display = document.getElementById("display");
    inp.onkeydown = dokeydown;
    /*
    doexp("sin(3 * pi / 2)");
    doexp("tau/2 - pi");
    doexp("pi^2");
    doexp("2^(2^(2^2))");
    doexp("sin(pi / 3)^2");
    doexp("a = 2");
    doexp("f(x, y) = x^2 + y^2");
    doexp("f(a, a^2)")
    */
    inp.focus();
};

function doexp(s)
{
    qs.splice(qs.length - 1, 0, s);
    tind = qs.length - 1;
    
    var res = parser.eval(s);
    var iel = document.createElement("label");
    var rel = document.createElement("label");
    iel.innerHTML = s;
    iel.style.color = "#707070";
    rel.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;" + res;
    rel.style.color = "red";
    rel.style["fontWeight"] = "bold";
    display.appendChild(iel); display.appendChild(document.createElement("br"));
    display.appendChild(rel); display.appendChild(document.createElement("br"));
    
    display.scrollTop = display.scrollHeight;
}

function dokeydown(e)
{
    var kc = e.keyCode;
    var ss, sub, ma;
    var sae = this.selectionEnd > this.selectionEnd;
    var sbe = this.selectionEnd < this.selectionStart;
    
    if (kc == 13)
    {
        var val = this.value;
        var lc = val.replace(/ /g, "").toLowerCase();
        switch (lc)
        {
            case "clear":
            case "clearconsole":
                display.innerHTML = "";
                this.value = "";
                return;
        }
        doexp(val);
        
        this.value = "";
    }
    else if (kc == 38 && tind > 0)
    {
        tind--;
        this.value = qs[tind];
        this.selectionEnd = this.value.length;
        e.preventDefault();
    }
    else if (kc == 40 && tind < qs.length - 1)
    {
        tind++;
        this.value = qs[tind];
        this.selectionEnd = this.value.length;
        e.preventDefault();
    }
}

function Parser()
{
    this.ans = 0;
    this.vars = new Dictionary();
    this.functions = new Trictionary();
    
    this.dovar = function(v)
    {
        var res = 0;
        
        switch (v)
        {
            case "pi": res = Math.PI; break;
            case "tau": res = Math.PI * 2; break;
            case "e": res = Math.E; break;
            case "phi": res = (1 + Math.sqrt(5)) / 2; break;
            case "ans": res = this.ans; break;
            default:
                res = this.eval(this.vars.valueFromKey(v));
                break;
        }
        
        return res;
    }
    
    this.dofunction = function(n, args)
    {
        var res = 0;
        var a = args[0];
        
        switch (n)
        {
            case "sin": res = Math.sin(+this.eval(a)); break;
            case "cos": res = Math.cos(+this.eval(a)); break;
            case "tan": res = Math.tan(+this.eval(a)); break;
            case "asin": res = Math.asin(+this.eval(a)); break;
            case "acos": res = Math.acos(+this.eval(a)); break;
            case "atan": res = Math.atan(+this.eval(a)); break;
            
            case "exp": res = Math.exp(+this.eval(a)); break;
            case "round": res = Math.round(+this.eval(a)); break;
            case "ceil": res = Math.ceil(+this.eval(a)); break;
            case "floor": res = Math.floor(+this.eval(a)); break;
            case "abs": res = Math.abs(+this.eval(a)); break;
            
            case "pow":
                var b = 2;
                if (args[1] !== undefined) b = +this.eval(args[1]);
                res = Math.pow(+this.eval(a), b);
                break;
            case "root":
            case "sqrt":
                var b = 2;
                if (args[1] !== undefined) b = +this.eval(args[1]);
                res = Math.pow(+this.eval(a), 1 / b);
                break;
            case "sum":
            case "summation":
                var svar = a.substring(0, a.indexOf("=")).replace(/ |\t|\n/g, "");
                var expv = +this.eval(a.substring(a.indexOf("=") + 1));
                
                var b = "2";
                var c = "0";
                if (args[1] !== undefined) b = +this.eval(args[1]);
                if (args[2] !== undefined) c = args[2];
                res = 0;
                
                var rkeys = clone(this.vars.keys);
                var rvalues = clone(this.vars.values);
                
                for (var i = expv; i <= b; i++)
                {
                    this.vars.removeKey(svar);
                    this.vars.addItem(svar, i);
                    res += +this.eval(c);
                }
                
                this.vars.keys = rkeys;
                this.vars.values = rvalues;
                break;
            default:
                var rkeys = clone(this.vars.keys);
                var rvalues = clone(this.vars.values);
                
                var targs = this.functions.fvalueFromKey(n);
                var texp = this.functions.svalueFromKey(n);
                for (var i in targs)
                    this.vars.addItem(targs[i], this.eval(args[i]));
                
                res = this.eval(texp);
                
                this.vars.keys = rkeys;
                this.vars.values = rvalues;
                break;
        }
        
        return res;
    }
    
    this.eval = function(s)
    {
        var fop;
        s = "" + s;
        var prs = preplace(s);
        
        if (prs.indexOf("=") != -1)
        {
            var sub = s.substring(0, s.indexOf("=")).replace(/ /g, "");
            
            if (sub.replace(/\(|\)/g, "") != sub)
            {
                var fn = sub.substring(0, sub.indexOf("("));
                var com = ssplit(sub.substring(sub.indexOf("(") + 1, endparen(sub)));
                for (var i in com)
                    com[i] = com[i].replace(/ /g, "");
                
                var texp = s.substring(s.indexOf("=") + 1);
                this.functions.removeKey(fn);
                this.functions.addItem(fn, com, texp);
                
                return fn;
            }
            else
            {
                var exp = s.substring(s.indexOf("=") + 1);
                this.vars.removeKey(sub);
                this.vars.addItem(sub, exp);
                
                return this.eval(exp);
            }
        }
        
        s = s.replace(/(\-)?\.[0-9]+(e(\+|\-)?[0-9]+(\.[0-9]+)?)?|(\-)?[0-9]+\.[0-9]+?(e(\+|\-)?[0-9]+(\.[0-9]+)?)?/g, function(m)
        {
            if (m.replace(/(\-)?\.[0-9]+(e(\+|\-)?[0-9]+(\.[0-9]+)?)?/g, "") == "")
            {
                var dind = m.indexOf(".");
                return m.substring(0, dind) + "0" + m.substring(dind);
            }
            
            return m;
        });
        s = s.replace(/\)\(/g, ")*(");
        
        s = s.replace(/(\-)?[0-9]+(\.[0-9]+)?e(\+|\-)?[0-9]+(\.[0-9]+)?|([0-9]|\))[a-z]+|\)[a-z0-9]|[0-9]\(/g, function(m)
        {
            if (m.replace(/([0-9]|\))[a-z]+|\)[a-z0-9]|[0-9]\(/g, "") != "")
            {
                var na = +m.substring(0, m.indexOf("e"));
                var nb = +m.substring(m.indexOf("e") + 1);
                return na + "*10^" + nb;
            }
            else
                return m.substring(0, 1) + "*" + m.substring(1);
        });
        
        fop = /[a-z]+\(/g;
        while (s.replace(fop, "") != s)
        {
            var fn = s.match(fop)[0];
            var f = fn.substring(0, fn.length - 1);
            var ind = s.indexOf(fn);
            var ep = endparen(s.substring(ind)) + ind;
            var rargs = s.substring(ind + fn.length, ep);
            
            var args = ssplit(rargs);
            
            s = s.substring(0, ind) + this.dofunction(f, args) + s.substring(ep + 1);
        }
        
        fop = /(\-)?[0-9]+(\.[0-9]+)?e(\+|\-)?[0-9]+(\.[0-9]+)?|[a-z]+/g;
        while (s.replace(fop, "") != s)
        {
            var v = s.match(fop)[0];
            var ind = s.indexOf(v);
            
            if (v.replace(/[a-z]+/g, "") != "")
            {
                var na = +v.substring(0, v.indexOf("e"));
                var nb = +v.substring(v.indexOf("e") + 1);
                s = s.substring(0, ind) + na + "*10^" + nb + s.substring(ind + v.length);
            }
            else
                s = s.substring(0, ind) + this.dovar(v) + s.substring(ind + v.length);
        }
        s = s.replace(/ |\t|\n|\r/g, "");
        
        while (s.replace(/\(|\)/g, "") != s && s.indexOf("(") != -1 && s.indexOf(")") != -1)
        {
            var lp = s.lastIndexOf("(");
            var ep = s.indexOf(")", lp);
            if (ep < lp) return 0;
            
            var exp = s.substring(lp + 1, ep);
            s = s.substring(0, lp) + this._eval(exp) + s.substring(ep + 1);
        }
        var tres = this._eval(s);
        this.ans = tres;
        
        return tres;
    };
    
    this._eval = function(s)
    {
        var ma, mas, res, fop, ind, na, nb;
        s = s.replace(/\-\-/g, "+");
        
        s = s.replace(/(\-)?\.[0-9]+(e(\+|\-)?[0-9]+(\.[0-9]+)?)?\-(\-)?\.[0-9]+(e(\+|\-)?[0-9]+(\.[0-9]+)?)?/g, function(m)
        {
            var fm = m.match(/(\-)?\.[0-9]+(e(\+|\-)?[0-9]+(\.[0-9]+)?)?/g)[0];
            m = m.substring(0, fm.length) + "+" + m.substring(fm.length);
            return m;
        })
        
        fop = /(\-)?[0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+(\.[0-9]+)?)?\^(\-)?[0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+(\.[0-9]+)?)?/g;
        while (s.replace(fop, "") != s)
        {
            mas = s.match(fop); ma = mas[mas.length - 1];
            ind = s.lastIndexOf(ma);
            
            na = ma.substring(0, ma.indexOf("^"));
            nb = ma.substring(ma.indexOf("^") + 1);
            s = s.substring(0, ind) + Math.pow(na, nb) + s.substring(ind + ma.length);
        }
        
        fop = /(\-)?[0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+(\.[0-9]+)?)?(\*|\/|\%|and|or|xor|\&|\|)(\-)?[0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+(\.[0-9]+)?)?/g;
        while (s.replace(fop, "") != s)
        {
            ma = s.match(fop)[0];
            ind = s.indexOf(ma);
            op = ma.match(/(\*|\/|\%)/)[0];
            
            na = ma.substring(0, ma.indexOf(op));
            nb = ma.substring(ma.indexOf(op) + op.length);
            res = 0;
            
            switch (op)
            {
                case "*": res = na * nb; break;
                case "/": res = na / nb; break;
                case "%": res = na % nb; break;
                case "and":
                case "&": res = na & nb; break;
                case "or":
                case "|": res = na | nb; break;
                case "xor": res = na ^ nb; break;
            }
            s = s.substring(0, ind) + res + s.substring(ind + ma.length);
            
        }
        
        mas = matches(s, /(\-)?[0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+(\.[0-9]+)?)?/g);
        var tres = 0;
        for (var i in mas)
            tres += +mas[i].value;
        this.ans = tres;
        return tres;
    };
}

function clone(obj)
{
    var temp = obj.constructor();
    for (var i in obj)
        temp[i] = obj[i];
    return temp;
}

function endparen(s)
{
    var sp = 0, ep = 0;
    var oind = 0;
    
    while (s.indexOf("(") != -1 || s.indexOf(")") != -1)
    {
        var tind = 0;
        if (s.indexOf("(") < s.indexOf(")") && s.indexOf("(") != -1 || s.indexOf(")") == -1)
        {
            sp++;
            tind = s.indexOf("(") + 1;
        }
        else
        {
            ep++;
            tind = s.indexOf(")") + 1;
        }
        oind += tind;
        
        if (sp == ep) return oind - 1;
        s = s.substring(tind);
    }
    return -1;
}

function Trictionary()
{
    this.keys = [];
    this.fvalues = [];
    this.svalues = [];
    
    this.addItem = function(k, va, vb)
    {
        this.keys.push(k);
        this.fvalues.push(va);
        this.svalues.push(vb);
    };
    this.removeKey = function(k)
    {
        var ind = this.keys.indexOf(k);
        if (ind == -1) return;
        this.keys.splice(ind, 1);
        this.fvalues.splice(ind, 1);
        this.svalues.splice(ind, 1);
    };
    this.fvalueFromKey = function(k)
    {
        var ind = this.keys.indexOf(k);
        if (ind == -1) return "";
        return this.fvalues[ind];
    };
    this.svalueFromKey = function(k)
    {
        var ind = this.keys.indexOf(k);
        if (ind == -1) return "";
        return this.svalues[ind];
    }
}

function Dictionary()
{
    this.keys = [];
    this.values = [];
    
    this.addItem = function(k, v)
    {
        this.keys.push(k);
        this.values.push(v);
    };
    this.removeKey = function(k)
    {
        var ind = this.keys.indexOf(k);
        if (ind == -1) return;
        this.keys.splice(ind, 1);
        this.values.splice(ind, 1);
    };
    this.valueFromKey = function(k)
    {
        var ind = this.keys.indexOf(k);
        if (ind == -1) return "";
        return this.values[ind];
    };
}

function ssplit(s)  // Splits string with commas, taking into account parenthesis
{
    var res = [];
    
    while (preplace(s).indexOf(",") != -1)
    {
        var tind = 0;
        
        if (s.indexOf(",") < s.indexOf("(") && s.indexOf(",") != -1 || s.indexOf("(") == -1)
        {
            tind = s.indexOf(",");
            res.push(s.substring(0, tind));
        }
        else
        {
            while (preplace(s.substring(0, tind)).indexOf(",") == -1)
            {
                if (s.indexOf(",", tind) < s.indexOf("(", tind) || s.indexOf("(", tind) == -1) tind = s.indexOf(",", tind) + 1;
                else tind += endparen(s.substring(tind)) + 1;
            }
            tind--;
            
            res.push(s.substring(0, tind));
        }
        s = s.substring(tind + 1);
    }
    res.push(s);
    return res;
}

function preplace(s)
{
    while (s.indexOf("(") != -1 && s.indexOf(")") != -1)
    {
        var ep = endparen(s);
        s = s.substring(0, s.indexOf("(")) + s.substring(ep + 1);
        if (s.substring(ep, ep + 1) == ")") s = s.substring(0, ep) + s.substring(ep + 1);
    }
    
    return s;
}

function matches(s, reg)
{
    var res = [];
    var tind = 0;
    while (s.replace(reg, "") != s)
    {
        var ma = s.match(reg)[0];
        var ind = s.indexOf(ma);
        tind += ind;
        res.push(new match(ma, tind));
        s = s.substring(ind + ma.length);
    }
    return res;
}

function match(key, ind)
{
    this.value = key;
    this.index = ind;
}
