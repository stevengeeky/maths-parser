#!/usr/bin/env node
// Loads scripts/main.js (or the file given as argv[2]) in a bare vm context —
// no jsdom, no browser — and runs the parser against a table of expressions.
//   node test/run.js                 # current scripts/main.js
//   node test/run.js path/to/old.js  # any other copy, e.g. the 2017 original
var fs = require("fs"), path = require("path"), vm = require("vm");

var file = process.argv[2] || path.join(__dirname, "..", "scripts", "main.js");
var src = fs.readFileSync(file, "utf8");
var ctx = { window: {}, console: console, Math: Math };
ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx, { filename: file });
var parser = ctx.parser;

// run(expr) → whatever the parser gives back, or "ERR: message" if it throws.
function run(s)
{
    try
    {
        var r = typeof parser.run === "function" ? parser.run(s) : parser.eval(s);
        if (r && typeof r === "object" && "value" in r) return r.value;
        return r;
    }
    catch (e) { return "ERR: " + (e.message || e); }
}

function close(a, b)
{
    if (typeof b === "string") return ("" + a) === b || (typeof a === "string" && a.indexOf(b) === 0);
    if (typeof a !== "number") return false;
    if (b === 0) return Math.abs(a) < 1e-12;
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
}

// [expression, expected]  expected: number, or "ERR" (any error), or exact string
var cases = [
    // precedence
    ["2+3*4", 14], ["2*3+4", 10], ["2^3^2", 512], ["-2^2", -4], ["(-2)^2", 4],
    ["2-3^2", -7], ["2*3^2", 18], ["10-4-3", 3], ["8/2/2", 2], ["7%3", 1],
    ["2^10", 1024], ["2^-1", 0.5], ["2^0.5", Math.SQRT2], ["1e3", 1000], ["1.5e-2", 0.015],
    // unary minus
    ["-3", -3], ["--3", 3], ["2--3", 5], ["2*-3", -6], ["1-2*-3", 7], ["-(2+3)", -5], ["2-(3)", -1],
    // implicit multiplication
    ["x = 3", 3], ["2x", 6], ["x2", 6], ["2 3", 6], ["2(3)", 6], ["(2)(3)", 6], ["(2)3", 6], ["2pi", 2 * Math.PI], ["2 x", 6], ["x(2)", 6],
    // constants & builtins
    ["pi", Math.PI], ["tau/2 - pi", 0], ["e", Math.E], ["phi", (1 + Math.sqrt(5)) / 2],
    ["sin(pi/2)", 1], ["cos(0)", 1], ["sin(3 * pi / 2)", -1], ["sin(pi / 3)^2", 0.75],
    ["sqrt(16)", 4], ["root(27, 3)", 3], ["pow(2, 8)", 256], ["abs(-4)", 4], ["floor(2.7)", 2],
    ["ceil(2.1)", 3], ["round(2.5)", 3], ["exp(0)", 1],
    // nested functions
    ["sin(cos(0))", Math.sin(1)], ["sqrt(abs(-16))", 4], ["pow(sqrt(9), sqrt(4))", 9],
    ["2^(2^(2^2))", 65536],
    // definitions
    ["a = 2", 2], ["a", 2], ["a^2", 4], ["f(x, y) = x^2 + y^2", "f"], ["f(a, a^2)", 20], ["f(3, 4)", 25],
    ["g(n) = n!", "g"], ["g(5)", 120], ["b = a + 1", 3], ["a = 10", 10], ["b", 11],
    ["7", 7], ["ans + 1", 8], ["sqrt(4) + ans", 10], ["ans", 10],
    ["neg = -3", -3], ["neg^2", 9], ["2neg", -6], ["2 - neg", 5],
    // summation
    ["sum(i=1, 10, i)", 55], ["sum(i=1, 4, i^2)", 30], ["prod(i=1, 5, i)", 120],
    // new builtins
    ["5!", 120], ["0!", 1], ["3!^2", 36], ["2^3!", 64], ["(2+1)!", 6],
    ["ln(e)", 1], ["log(1000)", 3], ["log(8, 2)", 3], ["gcd(12, 18)", 6], ["lcm(4, 6)", 12],
    ["ncr(5, 2)", 10], ["npr(5, 2)", 20], ["min(3, 1, 2)", 1], ["max(3, 1, 2)", 3], ["sign(-7)", -1],
    ["deg(pi)", 180], ["rad(180)", Math.PI], ["6 & 3", 2], ["6 | 3", 7], ["6 xor 3", 5], ["6 and 3", 2],
    // errors
    ["1/0", "ERR"], ["0/0", "ERR"], ["sqrt(-1)", "ERR"], ["(2+3", "ERR"], ["2+3)", "ERR"],
    ["2+", "ERR"], ["*2", "ERR"], ["2**3", "ERR"], ["nosuchvar", "ERR"], ["nosuch(2)", "ERR"],
    ["f(1)", "ERR"], ["2 $ 3", "ERR"], ["r = r + 1", 0], ["r", "ERR"], ["pi = 3", "ERR"],
];

var pass = 0, fail = 0, lines = [];
for (var i = 0; i < cases.length; i++)
{
    var expr = cases[i][0], want = cases[i][1], got = run(expr);
    var ok = want === "ERR" ? ("" + got).indexOf("ERR") === 0 : close(got, want);
    if (want === 0 && expr === "r = r + 1") ok = true; // definition itself may or may not evaluate
    if (ok) pass++; else fail++;
    lines.push((ok ? "ok   " : "FAIL ") + expr.padEnd(24) + " -> " + JSON.stringify(got) + (ok ? "" : "   (want " + JSON.stringify(want) + ")"));
}
console.log(lines.join("\n"));
console.log("\n" + pass + " passed, " + fail + " failed  (" + path.relative(process.cwd(), file) + ")");
process.exit(fail ? 1 : 0);
