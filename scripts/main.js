var inp, display, qs = ["", ""], tind = 1,
    parser = new Parser();

var STORE_KEY = "maths-parser";
var HISTORY_MAX = 200;

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

    // clicking anywhere on the terminal (without selecting text) refocuses the input;
    // clicking an old input line puts it back in the prompt
    document.onclick = function(ev)
    {
        var t = ev.target;
        if (t && t.className && ("" + t.className).indexOf("in") != -1 && t.parentNode == display)
        {
            inp.value = t.textContent.replace(/^> /, "");
            inp.focus();
            inp.selectionStart = inp.selectionEnd = inp.value.length;
            return;
        }
        var sel = window.getSelection ? "" + window.getSelection() : "";
        if (sel == "" && ev.target != inp) inp.focus();
    };

    var n = load();
    if (n.defs || n.history)
        echo("restored " + n.defs + " definition" + (n.defs == 1 ? "" : "s") + " and " + n.history + " line" + (n.history == 1 ? "" : "s") + " of history  ·  type help", "dim");
    else
        echo("maths parser  ·  type help", "dim");

    inp.focus();
};

function doexp(s)
{
    if (s.replace(/\s/g, "") == "") return;

    qs.splice(qs.length - 1, 0, s);
    if (qs.length > HISTORY_MAX + 2) qs.splice(1, qs.length - HISTORY_MAX - 2);
    tind = qs.length - 1;

    echo("> " + s, "in");

    var cmd = docommand(s);
    if (cmd === undefined)
    {
        var res, err = null;
        try { res = parser.run(s); }
        catch (ex) { err = ex; }

        if (err)
        {
            var pos = err.pos;
            if (pos === undefined && err.name) pos = locate(s, err.name);
            if (pos === undefined && !(err instanceof ParseError)) pos = -1;
            if (pos !== undefined && pos >= 0) echo("  " + Array(pos + 1).join(" ") + "^", "caret");
            echo(err instanceof ParseError ? err.message : "internal error: " + (err.message || err), "err");
        }
        else
            echo("    " + fmt(res), "out");
    }

    save();
    display.scrollTop = display.scrollHeight;
}

function echo(text, cls)
{
    var el = document.createElement("div");
    el.className = "line " + cls;
    el.textContent = text;
    display.appendChild(el);
    return el;
}

function dokeydown(e)
{
    var k = e.key;

    if (k == "Enter")
    {
        var val = this.value;
        this.value = "";
        doexp(val);
    }
    else if (k == "ArrowUp" && tind > 0)
    {
        if (tind == qs.length - 1) qs[tind] = this.value;  // keep the half-typed line
        tind--;
        this.value = qs[tind];
        this.selectionStart = this.selectionEnd = this.value.length;
        e.preventDefault();
    }
    else if (k == "ArrowDown" && tind < qs.length - 1)
    {
        tind++;
        this.value = qs[tind];
        this.selectionStart = this.selectionEnd = this.value.length;
        e.preventDefault();
    }
    else if (k == "Escape")
    {
        this.value = "";
        tind = qs.length - 1;
    }
    else if (k == "l" && e.ctrlKey)
    {
        display.innerHTML = "";
        e.preventDefault();
    }
}

// ---- commands (anything that is not an expression) ----

var COMMANDS = [
    ["help",        "this list"],
    ["vars",        "show every variable and function you have defined"],
    ["forget x",    "forget the variable or function x"],
    ["reset",       "forget every definition and the history"],
    ["clear",       "clear the screen (also ctrl+L)"],
];

function docommand(s)
{
    var lc = s.replace(/\s+/g, " ").replace(/^ | $/g, "").toLowerCase();
    var word = lc.split(" ")[0];

    switch (word)
    {
        case "clear":
        case "clearconsole":
        case "cls":
            display.innerHTML = "";
            return true;

        case "help":
        case "?":
            echo(helptext(), "help");
            return true;

        case "vars":
        case "defs":
        case "list":
            var lines = parser.listdefs();
            echo(lines.length ? lines.join("\n") : "nothing defined yet  ·  try  a = 2  or  f(x) = x^2", "help");
            return true;

        case "forget":
        case "del":
        case "delete":
        case "unset":
            var name = lc.substring(word.length + 1).replace(/\(.*$/, "");
            if (name == "") { echo("forget what?  ·  forget x", "err"); return true; }
            var n = parser.forget(name);
            echo(n ? "    forgot " + name : "    nothing called " + name, n ? "dim" : "err");
            return true;

        case "reset":
            parser.reset();
            qs = ["", ""]; tind = 1;
            display.innerHTML = "";
            echo("everything forgotten", "dim");
            return true;
    }
    return undefined;
}

function helptext()
{
    var out = [];
    var i, w = 22;
    function row(a, b) { out.push("  " + a + Array(Math.max(1, w - a.length)).join(" ") + b); }

    out.push("commands");
    for (i = 0; i < COMMANDS.length; i++) row(COMMANDS[i][0], COMMANDS[i][1]);
    out.push("");
    out.push("operators   + - * / % ^ !   and & or | xor   (parentheses)   2x 2(3) (2)(3) mean multiply");
    out.push("            ^ groups right: 2^3^2 = 512   -2^2 = -4   5! = 120   7 % 3 = 1");
    out.push("");
    out.push("constants   " + CONSTANTS.join("  ") + "   (ans = the last result)");
    out.push("");
    out.push("define      a = 2        f(x, y) = x^2 + y^2        then  f(a, 3)");
    out.push("");
    out.push("functions");
    for (i = 0; i < BUILTINS.length; i++) row(BUILTINS[i][0], BUILTINS[i][1]);
    return out.join("\n");
}

// where in the typed line a name sits, so the caret can point at it
function locate(s, name)
{
    var re = new RegExp("(^|[^a-z])(" + name + ")(?![a-z])", "i");
    var m = re.exec(s);
    return m ? m.index + m[1].length : -1;
}

function fmt(v)
{
    if (typeof v != "number") return "" + v;
    if (v === 0) return "0";
    var a = Math.abs(v);
    if (a >= 1e21 || a < 1e-7) return "" + parseFloat(v.toPrecision(12));
    var r = parseFloat(v.toPrecision(15));   // hides 0.30000000000000004
    return "" + r;
}

// ---- localStorage (everything guarded: private windows throw) ----

function save()
{
    try
    {
        var data = {
            vars: { keys: parser.vars.keys, values: parser.vars.values },
            functions: { keys: parser.functions.keys, fvalues: parser.functions.fvalues, svalues: parser.functions.svalues },
            history: qs.slice(1, qs.length - 1),
            ans: parser.ans
        };
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
    }
    catch (e) {}
}

function load()
{
    var n = { defs: 0, history: 0 };
    try
    {
        var raw = localStorage.getItem(STORE_KEY);
        if (!raw) return n;
        var data = JSON.parse(raw);
        if (data.vars && data.vars.keys)
        {
            parser.vars.keys = data.vars.keys;
            parser.vars.values = data.vars.values;
        }
        if (data.functions && data.functions.keys)
        {
            parser.functions.keys = data.functions.keys;
            parser.functions.fvalues = data.functions.fvalues;
            parser.functions.svalues = data.functions.svalues;
        }
        if (data.history && data.history.length)
        {
            qs = [""].concat(data.history.slice(-HISTORY_MAX), [""]);
            tind = qs.length - 1;
        }
        if (typeof data.ans == "number") parser.ans = data.ans;
        n.defs = parser.vars.keys.length + parser.functions.keys.length;
        n.history = qs.length - 2;
    }
    catch (e) {}
    return n;
}

// ---- the language ----

var CONSTANTS = ["pi", "tau", "e", "phi", "ans"];

// name, signature, description, min args, max args
var BUILTINS = [
    ["sin(x) cos(x) tan(x)",       "trig, x in radians"],
    ["asin(x) acos(x) atan(x)",    "inverse trig; atan(y, x) is the two-argument form"],
    ["sinh(x) cosh(x) tanh(x)",    "hyperbolic"],
    ["deg(x)  rad(x)",             "radians to degrees, degrees to radians"],
    ["sqrt(x)  root(x, n)",        "square root, nth root"],
    ["pow(x, n)  exp(x)",          "x^n, e^x"],
    ["ln(x)  log(x)  log(x, b)",   "natural log, log base 10, log base b"],
    ["abs(x)  sign(x)",            "absolute value, -1 0 or 1"],
    ["floor(x) ceil(x) round(x) trunc(x)", "to an integer"],
    ["min(a, b, ...)  max(a, b, ...)", "smallest, largest"],
    ["mod(a, b)",                  "remainder with the sign of b (a % b keeps the sign of a)"],
    ["gcd(a, b, ...)  lcm(a, b, ...)", "greatest common divisor, least common multiple"],
    ["fact(n)  or  n!",            "factorial (gamma for non-integers)"],
    ["ncr(n, r)  npr(n, r)",       "combinations, permutations"],
    ["sum(i=1, 10, i^2)",          "add i^2 for i from 1 to 10"],
    ["prod(i=1, 5, i)",            "multiply i for i from 1 to 5"],
];

var ARITY = {
    sin: [1, 1], cos: [1, 1], tan: [1, 1], asin: [1, 1], acos: [1, 1], atan: [1, 2],
    sinh: [1, 1], cosh: [1, 1], tanh: [1, 1], deg: [1, 1], rad: [1, 1],
    sqrt: [1, 2], root: [1, 2], pow: [1, 2], exp: [1, 1], ln: [1, 1], log: [1, 2],
    abs: [1, 1], sign: [1, 1], floor: [1, 1], ceil: [1, 1], round: [1, 2], trunc: [1, 1],
    min: [1, Infinity], max: [1, Infinity], mod: [2, 2], gcd: [1, Infinity], lcm: [1, Infinity],
    fact: [1, 1], factorial: [1, 1], ncr: [2, 2], choose: [2, 2], npr: [2, 2],
    sum: [3, 3], summation: [3, 3], prod: [3, 3], product: [3, 3]
};

function ParseError(message, pos, name)
{
    this.message = message;
    this.pos = pos;
    this.name = name;
}
ParseError.prototype = Object.create(Error.prototype);
ParseError.prototype.constructor = ParseError;

function Parser()
{
    this.ans = 0;
    this.vars = new Dictionary();
    this.functions = new Trictionary();
    this.depth = 0;

    // the entry point: lint the typed line, evaluate it, remember the answer
    this.run = function(s)
    {
        s = "" + s;
        lint(s);
        this.depth = 0;
        var v = this.eval(s);
        if (typeof v == "number") this.ans = v;
        return v;
    };

    this.isconstant = function(v) { return CONSTANTS.indexOf(v) != -1; };
    this.isvar = function(v) { return this.isconstant(v) || this.vars.keys.indexOf(v) != -1; };
    this.isbuiltin = function(n) { return ARITY.hasOwnProperty(n); };
    this.isfunction = function(n) { return this.isbuiltin(n) || this.functions.keys.indexOf(n) != -1; };

    this.listdefs = function()
    {
        var out = [], i;
        for (i = 0; i < this.vars.keys.length; i++)
            out.push(this.vars.keys[i] + " = " + trim(this.vars.values[i]));
        for (i = 0; i < this.functions.keys.length; i++)
            out.push(this.functions.keys[i] + "(" + this.functions.fvalues[i].join(", ") + ") = " + trim(this.functions.svalues[i]));
        return out;
    };

    this.forget = function(name)
    {
        var n = 0;
        if (this.vars.keys.indexOf(name) != -1) { this.vars.removeKey(name); n++; }
        if (this.functions.keys.indexOf(name) != -1) { this.functions.removeKey(name); n++; }
        return n;
    };

    this.reset = function()
    {
        this.vars = new Dictionary();
        this.functions = new Trictionary();
        this.ans = 0;
    };

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
                if (this.vars.keys.indexOf(v) == -1)
                {
                    if (this.isfunction(v)) throw new ParseError(v + " is a function: " + v + "(...)", undefined, v);
                    throw new ParseError("unknown variable " + v, undefined, v);
                }
                res = this.eval(this.vars.valueFromKey(v));
                break;
        }

        return res;
    };

    this.dofunction = function(n, args)
    {
        var res = 0, i, x, b;
        var a = args[0];
        if (args.length == 1 && trim(a) == "") args = [];

        if (this.isbuiltin(n))
        {
            var ar = ARITY[n];
            if (args.length < ar[0] || args.length > ar[1])
                throw new ParseError(n + " takes " + (ar[0] == ar[1] ? ar[0] : ar[1] == Infinity ? "at least " + ar[0] : ar[0] + " or " + ar[1]) + " argument" + (ar[0] == 1 && ar[1] == 1 ? "" : "s") + ", got " + args.length, undefined, n);
        }

        switch (n)
        {
            case "sum":
            case "summation":
            case "prod":
            case "product":
                if (a.indexOf("=") == -1) throw new ParseError(n + " needs a counter: " + n + "(i=1, 10, i^2)", undefined, n);
                var svar = a.substring(0, a.indexOf("=")).replace(/ |\t|\n/g, "");
                if (!/^[a-z]+$/.test(svar) || this.isconstant(svar)) throw new ParseError("bad counter name in " + n + ": " + svar, undefined, n);
                var expv = +this.eval(a.substring(a.indexOf("=") + 1));

                b = +this.eval(args[1]);
                var c = args[2];
                var isprod = n.charAt(0) == "p";
                res = isprod ? 1 : 0;
                if (b - expv > 1e6) throw new ParseError(n + ": that is more than a million steps", undefined, n);

                var rkeys = clone(this.vars.keys);
                var rvalues = clone(this.vars.values);

                for (i = expv; i <= b; i++)
                {
                    this.vars.removeKey(svar);
                    this.vars.addItem(svar, i);
                    if (isprod) res *= +this.eval(c);
                    else res += +this.eval(c);
                }

                this.vars.keys = rkeys;
                this.vars.values = rvalues;
                break;

            default:
                if (this.isbuiltin(n))
                {
                    x = [];
                    for (i = 0; i < args.length; i++) x.push(+this.eval(args[i]));
                    res = builtin(n, x);
                    break;
                }

                if (this.functions.keys.indexOf(n) == -1)
                    throw new ParseError("unknown function " + n, undefined, n);

                var targs = this.functions.fvalueFromKey(n);
                var texp = this.functions.svalueFromKey(n);
                if (targs.length != args.length)
                    throw new ParseError(n + "(" + targs.join(", ") + ") takes " + targs.length + " argument" + (targs.length == 1 ? "" : "s") + ", got " + args.length, undefined, n);

                x = [];
                for (i = 0; i < args.length; i++) x.push(this.eval(args[i]));   // in the caller's scope

                var rkeys = clone(this.vars.keys);
                var rvalues = clone(this.vars.values);

                for (i = 0; i < targs.length; i++)
                    this.vars.addItem(targs[i], x[i]);

                try { res = this.eval(texp); }
                finally
                {
                    this.vars.keys = rkeys;
                    this.vars.values = rvalues;
                }
                break;
        }

        if (typeof res == "number" && !isFinite(res))
            throw new ParseError(n + "(" + args.join(", ").replace(/\s+/g, " ") + ") is not a real number", undefined, n);

        return res;
    };

    this.eval = function(s)
    {
        if (++this.depth > 200)
        {
            this.depth = 0;
            throw new ParseError("too deep: does a definition refer to itself?");
        }
        try { return this._evalfull(s); }
        finally { this.depth--; }
    };

    this._evalfull = function(s)
    {
        var fop;
        s = ("" + s).toLowerCase();
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
                if (com.length == 1 && com[0] == "") com = [];

                if (!/^[a-z]+$/.test(fn)) throw new ParseError("cannot define " + (fn == "" ? "a function with no name" : fn), 0);
                if (this.isbuiltin(fn)) throw new ParseError(fn + " is a built-in function", 0, fn);
                if (this.isconstant(fn)) throw new ParseError(fn + " is a built-in constant", 0, fn);
                for (var i = 0; i < com.length; i++)
                {
                    if (!/^[a-z]+$/.test(com[i])) throw new ParseError("bad parameter name " + (com[i] == "" ? "(empty)" : com[i]), undefined, com[i] || fn);
                    if (this.isconstant(com[i])) throw new ParseError(com[i] + " is a built-in constant", undefined, com[i]);
                }

                var texp = s.substring(s.indexOf("=") + 1);
                if (trim(texp) == "") throw new ParseError("expected an expression after =", s.indexOf("="));
                this.functions.removeKey(fn);
                this.functions.addItem(fn, com, texp);

                return fn + "(" + com.join(", ") + ") = " + trim(texp);
            }
            else
            {
                var exp = s.substring(s.indexOf("=") + 1);
                if (!/^[a-z]+$/.test(sub)) throw new ParseError("cannot assign to " + (sub == "" ? "nothing" : sub), 0);
                if (this.isconstant(sub)) throw new ParseError(sub + " is a built-in constant", 0, sub);
                if (this.isbuiltin(sub)) throw new ParseError(sub + " is a built-in function", 0, sub);
                if (trim(exp) == "") throw new ParseError("expected an expression after =", s.indexOf("="));

                var old = this.vars.valueFromKey(sub), had = this.vars.keys.indexOf(sub) != -1;
                this.vars.removeKey(sub);
                this.vars.addItem(sub, exp);

                try { return this.eval(exp); }
                catch (ex)
                {
                    this.vars.removeKey(sub);
                    if (had) this.vars.addItem(sub, old);
                    throw ex;
                }
            }
        }

        s = s.replace(/\band\b/g, "&").replace(/\bor\b/g, "|").replace(/\bxor\b/g, "~");

        // "2 x", "2 3", "x y" mean multiply; "sin (x)" is just sin(x)
        s = s.replace(/([0-9a-z.)!])\s+([0-9a-z.])/g, "$1*$2");
        s = s.replace(/ |\t|\n|\r/g, "");

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

        s = s.replace(/(\-)?[0-9]+(\.[0-9]+)?e(\+|\-)?[0-9]+(\.[0-9]+)?|([0-9]|\))[a-z]+|\)[a-z0-9]|[0-9]\(|[a-z][0-9]/g, function(m)
        {
            if (m.replace(/([0-9]|\))[a-z]+|\)[a-z0-9]|[0-9]\(|[a-z][0-9]/g, "") != "")
                return m;
            else
                return m.substring(0, 1) + "*" + m.substring(1);
        });

        fop = /[a-z]+\(/g;
        while (s.replace(fop, "") != s)
        {
            var fn = s.match(fop)[0];
            var f = fn.substring(0, fn.length - 1);
            var ind = s.indexOf(fn);

            if (!this.isfunction(f))
            {
                if (this.isvar(f))
                {
                    s = s.substring(0, ind) + f + "*(" + s.substring(ind + fn.length);   // x(2) is x*(2)
                    continue;
                }
                throw new ParseError("unknown function " + f, undefined, f);
            }

            var ep = endparen(s.substring(ind)) + ind;
            var rargs = s.substring(ind + fn.length, ep);

            var args = ssplit(rargs);
            var r = this.dofunction(f, args);
            if (r < 0) r = "(" + r + ")";

            s = s.substring(0, ind) + r + s.substring(ep + 1);
        }

        // scientific notation keeps its e as E while variables are swapped in
        fop = /(\-)?[0-9]+(\.[0-9]+)?e(\+|\-)?[0-9]+(\.[0-9]+)?|[a-z]+/g;
        while (s.replace(fop, "") != s)
        {
            var v = s.match(fop)[0];
            var ind = s.indexOf(v);

            if (v.replace(/[a-z]+/g, "") != "")
                s = s.substring(0, ind) + v.replace("e", "E") + s.substring(ind + v.length);
            else
            {
                var r = this.dovar(v);
                if (r < 0) r = "(" + r + ")";
                s = s.substring(0, ind) + r + s.substring(ind + v.length);
            }
        }
        s = s.replace(/E/g, "e");

        while (s.indexOf("(") != -1 && s.indexOf(")") != -1)
        {
            var lp = s.lastIndexOf("(");
            var ep = s.indexOf(")", lp);
            if (ep < lp) throw new ParseError("mismatched parentheses");

            var exp = s.substring(lp + 1, ep);
            var r = this._eval(exp);
            var rest = s.substring(ep + 1);

            // (-2)^2 must be 4, but once the parens are gone -2^2 reads as -(2^2):
            // so raise a negative group to its power chain right here
            if (r < 0 && rest.charAt(0) == "^")
            {
                var chain = rest.match(/^(\^(\-)?[0-9]+(\.[0-9]+)?(e(\+|\-)?[0-9]+)?!*)+/);
                if (chain)
                {
                    r = Math.pow(r, this._eval(chain[0].substring(1)));
                    if (!isFinite(r)) throw new ParseError("(" + exp + ")" + chain[0] + " is not a real number");
                    rest = rest.substring(chain[0].length);
                }
            }
            s = s.substring(0, lp) + r + rest;
        }
        var tres = this._eval(s);

        return tres;
    };

    // s has no parentheses, letters, or spaces by now: just numbers and operators
    this._eval = function(s)
    {
        var ma, res, ind, na, nb, op;
        var num = "[0-9]+(\\.[0-9]+)?(e(\\+|\\-)?[0-9]+(\\.[0-9]+)?)?";
        s = normsigns(s);

        var fact = new RegExp("(" + num + ")!");
        while ((ma = fact.exec(s)))
        {
            res = factorial(+ma[1]);
            if (!isFinite(res)) throw new ParseError(ma[1] + "! is too big");
            s = s.substring(0, ma.index) + res + s.substring(ma.index + ma[0].length);
            s = normsigns(s);
        }

        // ^ groups right to left: 2^3^2 = 2^(3^2); the base carries no sign, so -2^2 = -(2^2)
        var lnum = new RegExp(num + "$"), rnum = new RegExp("^(\\-)?" + num);
        while (s.indexOf("^") != -1)
        {
            ind = s.lastIndexOf("^");
            na = s.substring(0, ind).match(lnum);
            nb = s.substring(ind + 1).match(rnum);
            if (!na || !nb) throw new ParseError("^ needs a number on both sides");

            res = Math.pow(+na[0], +nb[0]);
            if (!isFinite(res)) throw new ParseError(na[0] + "^" + nb[0] + " is " + (isNaN(res) ? "not a real number" : "too big"));
            s = s.substring(0, ind - na[0].length) + res + s.substring(ind + 1 + nb[0].length);
            s = normsigns(s);
        }

        var mul = new RegExp("(\\-)?" + num + "(\\*|\\/|\\%|\\&|\\||\\~)(\\-)?" + num);
        while ((ma = mul.exec(s)))
        {
            ind = ma.index; ma = ma[0];
            if (ma.charAt(0) == "-" && ind > 0 && /[0-9.]/.test(s.charAt(ind - 1)))
            {
                ma = ma.substring(1); ind++;   // in 1-2*-3 the first - belongs to the 1, not the 2
            }
            op = ma.match(/(\*|\/|\%|\&|\||\~)/)[0];

            na = +ma.substring(0, ma.indexOf(op));
            nb = +ma.substring(ma.indexOf(op) + op.length);
            res = 0;

            switch (op)
            {
                case "*": res = na * nb; break;
                case "/":
                    if (nb == 0) throw new ParseError(na == 0 ? "0/0 is undefined" : "division by zero");
                    res = na / nb; break;
                case "%":
                    if (nb == 0) throw new ParseError("modulo by zero");
                    res = na % nb; break;
                case "&": res = na & nb; break;
                case "|": res = na | nb; break;
                case "~": res = na ^ nb; break;
            }
            if (!isFinite(res)) throw new ParseError(na + " " + op + " " + nb + " is too big");
            s = s.substring(0, ind) + res + s.substring(ind + ma.length);
            s = normsigns(s);
        }

        var terms = new RegExp("(\\-)?" + num, "g");
        var left = s.replace(terms, "");
        if (/[^+\-]/.test(left) || /^\+|[+\-]$/.test(s) || /\-\-|\+\+|\+\-|\-\+/.test(s))
            throw new ParseError("cannot make sense of " + s.replace(/~/g, " xor "));

        var mas = matches(s, terms);
        var tres = 0;
        for (var i in mas)
            tres += +mas[i].value;
        if (!isFinite(tres)) throw new ParseError("too big");
        return tres;
    };
}

// -- + is +, +- and -+ are -, and a + right after another operator is dropped
function normsigns(s)
{
    var t;
    do
    {
        t = s;
        s = s.replace(/\-\-/g, "+").replace(/\+\-|\-\+/g, "-").replace(/\+\+/g, "+").replace(/([*\/%^&|~])\+/g, "$1").replace(/^\+/, "");
    } while (t != s);
    return s;
}

function builtin(n, x)
{
    var a = x[0], b = x[1], i, r;
    switch (n)
    {
        case "sin": return Math.sin(a);
        case "cos": return Math.cos(a);
        case "tan": return Math.tan(a);
        case "asin": return Math.asin(a);
        case "acos": return Math.acos(a);
        case "atan": return x.length > 1 ? Math.atan2(a, b) : Math.atan(a);
        case "sinh": return Math.sinh(a);
        case "cosh": return Math.cosh(a);
        case "tanh": return Math.tanh(a);
        case "deg": return a * 180 / Math.PI;
        case "rad": return a * Math.PI / 180;

        case "exp": return Math.exp(a);
        case "pow": return Math.pow(a, x.length > 1 ? b : 2);
        case "root":
        case "sqrt":
            b = x.length > 1 ? b : 2;
            if (a < 0 && b % 2 == 1) return -Math.pow(-a, 1 / b);   // root(-8, 3) = -2
            return b == 2 ? Math.sqrt(a) : Math.pow(a, 1 / b);
        case "ln": return Math.log(a);
        case "log": return x.length > 1 ? Math.log(a) / Math.log(b) : Math.log10(a);

        case "abs": return Math.abs(a);
        case "sign": return a > 0 ? 1 : a < 0 ? -1 : 0;
        case "floor": return Math.floor(a);
        case "ceil": return Math.ceil(a);
        case "round":
            if (x.length > 1) { r = Math.pow(10, b); return Math.round(a * r) / r; }
            return Math.round(a);
        case "trunc": return a < 0 ? Math.ceil(a) : Math.floor(a);
        case "min": return Math.min.apply(null, x);
        case "max": return Math.max.apply(null, x);
        case "mod": return ((a % b) + b) % b;

        case "gcd": r = 0; for (i = 0; i < x.length; i++) r = gcd(r, x[i]); return r;
        case "lcm": r = 1; for (i = 0; i < x.length; i++) r = Math.abs(r * x[i]) / gcd(r, x[i]); return r;
        case "fact":
        case "factorial": return factorial(a);
        case "ncr":
        case "choose": return ncr(a, b);
        case "npr": return factorial(a) / factorial(a - b);
    }
    return NaN;
}

function gcd(a, b)
{
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = b; b = a % b; a = t; }
    return a;
}

function ncr(n, r)
{
    if (r < 0 || r > n) return 0;
    if (n % 1 || r % 1) return factorial(n) / (factorial(r) * factorial(n - r));
    r = Math.min(r, n - r);
    var res = 1;
    for (var i = 1; i <= r; i++) res = res * (n - r + i) / i;
    return Math.round(res);
}

function factorial(n)
{
    if (n % 1 != 0 || n < 0) return gamma(n + 1);
    if (n > 170) return Infinity;
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
}

// Lanczos approximation, so 0.5! = sqrt(pi)/2
function gamma(z)
{
    var g = 7, i, x, t;
    var p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
             -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    x = p[0];
    for (i = 1; i < g + 2; i++) x += p[i] / (z + i);
    t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// Checks the typed line for the mistakes whose position is knowable before any rewriting
function lint(s)
{
    var depth = 0, opens = [], i, c, prev = "", pi = -1, eqs = 0;
    var isop = function(ch) { return "*/%^&|".indexOf(ch) != -1; };
    var isval = function(ch) { return /[a-z0-9.)!]/i.test(ch); };

    for (i = 0; i < s.length; i++)
    {
        c = s.charAt(i);
        if (/\s/.test(c)) continue;
        if (!/[a-z0-9.,+\-*\/%^&|!()=]/i.test(c)) throw new ParseError("unexpected character " + c, i);

        if (c == "(")
        {
            depth++; opens.push(i);
        }
        else if (c == ")")
        {
            if (depth == 0) throw new ParseError("unmatched )", i);
            if (prev == "(" && !/[a-z]/i.test(s.charAt(pi - 1) || "")) throw new ParseError("empty parentheses", pi);
            if (prev == "," || (prev != "(" && (isop(prev) || prev == "+" || prev == "-" || prev == "="))) throw new ParseError("expected a value after " + prev, pi);
            depth--; opens.pop();
        }
        else if (c == ",")
        {
            if (depth == 0) throw new ParseError("unexpected , outside parentheses", i);
            if (prev == "(" || prev == "," || isop(prev) || prev == "+" || prev == "-" || prev == "=") throw new ParseError("expected a value before ,", i);
        }
        else if (isop(c))
        {
            if (prev == "" || prev == "(" || prev == "," || prev == "=") throw new ParseError("expected a value before " + c, i);
            if (isop(prev) || prev == "+" || prev == "-") throw new ParseError("unexpected " + c + " after " + prev, i);
        }
        else if (c == "+" || c == "-")
        {
            if (prev == "+" || prev == "-") { /* --3 and 2--3 are fine */ }
        }
        else if (c == "!")
        {
            if (!isval(prev)) throw new ParseError("! needs a value before it", i);
        }
        else if (c == "=")
        {
            if (depth == 0 && ++eqs > 1) throw new ParseError("only one = per line", i);
            if (!isval(prev) || prev == "!" || prev == ".") throw new ParseError("expected a name before =", i);
        }
        prev = c; pi = i;
    }
    var w = s.match(/(^\s*(and|or|xor)\b)|(\b(and|or|xor)\s*$)|(\b(and|or|xor)\s+(and|or|xor)\b)/i);
    if (w) throw new ParseError("expected a value " + (w[1] ? "before " + w[2] : w[3] ? "after " + w[4] : "between " + w[6] + " and " + w[7]), w.index + (w[1] ? w[0].length - w[2].length : 0));
    if (depth > 0) throw new ParseError("missing ) for this (", opens[opens.length - 1]);
    if (prev == "" ) throw new ParseError("nothing to evaluate", 0);
    if (isop(prev) || prev == "+" || prev == "-" || prev == "," || prev == "=") throw new ParseError("expected a value after " + prev, pi);
}

function trim(s) { return ("" + s).replace(/^\s+|\s+$/g, ""); }

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
        var ind = this.keys.lastIndexOf(k);
        if (ind == -1) return;
        this.keys.splice(ind, 1);
        this.values.splice(ind, 1);
    };
    this.valueFromKey = function(k)   // the most recently added wins, so a parameter shadows a global
    {
        var ind = this.keys.lastIndexOf(k);
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
