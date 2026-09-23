# Maths Parser
A lightweight maths parser for handling normal maths expressions, variable and function definitions, as well as built-in constants and functions for trigonometry and discrete maths.

*A JavaScript Project by Steven O'Riley*

Open `index.html` in a browser. There is no build step, no server and no dependencies: one HTML file, one stylesheet, one script. Type an expression, press Enter.

## Language reference

### Numbers and operators

```
2 + 3 * 4        14        the usual precedence
2 ^ 3 ^ 2        512       ^ groups to the right, like maths
-2 ^ 2           -4        unary minus is applied after the power
(-2) ^ 2         4
7 % 3            1         remainder, keeps the sign of the left side
5!               120       factorial; 0.5! uses the gamma function
6 and 3          2         bitwise: and & or | xor   (same precedence as *)
1.5e-2, .5       0.015, 0.5
```

Multiplication can be left out: `2x`, `2(3)`, `(2)(3)`, `2pi`, `x y` and `2 3` all multiply.
Names are case-insensitive: `PI`, `Sin(0)` and `A = 5` work.

### Constants

`pi` `tau` `e` `phi` and `ans`, the last result.

### Definitions

```
a = 2
f(x, y) = x^2 + y^2
f(a, a^2)               20
```

Variables are stored as expressions, so `b = a + 1` follows `a` when `a` changes.
Function parameters shadow variables of the same name. Built-in names cannot be redefined.

### Functions

| | |
|---|---|
| `sin cos tan` `asin acos atan` | radians; `atan(y, x)` is the two-argument form |
| `sinh cosh tanh` | hyperbolic |
| `deg(x)` `rad(x)` | radians to degrees, degrees to radians |
| `sqrt(x)` `root(x, n)` | square root, nth root (`root(-8, 3)` is -2) |
| `pow(x, n)` `exp(x)` | x^n, e^x |
| `ln(x)` `log(x)` `log(x, b)` | natural log, log base 10, log base b |
| `abs sign floor ceil trunc` | |
| `round(x)` `round(x, n)` | to an integer, to n decimal places |
| `min(a, b, ...)` `max(a, b, ...)` | |
| `mod(a, b)` | remainder with the sign of b |
| `gcd(a, b, ...)` `lcm(a, b, ...)` | |
| `fact(n)` | same as `n!` |
| `ncr(n, r)` `npr(n, r)` | combinations, permutations |
| `sum(i=1, 10, i^2)` | adds `i^2` for i from 1 to 10 |
| `prod(i=1, 5, i)` | multiplies `i` for i from 1 to 5 |

### Errors

Every mistake gets a message and, where one is knowable, a caret under the place it happened:
unbalanced parentheses, a dangling operator, an unknown name, the wrong number of arguments,
division by zero, results that are not real numbers, and a definition that refers to itself.

### Commands

| | |
|---|---|
| `help` | everything above, in the terminal |
| `vars` | list your definitions |
| `forget x` | drop a variable or function |
| `reset` | drop all definitions and the history |
| `clear` (or ctrl+L) | clear the screen |

Up and down arrows walk the history; Escape empties the line; clicking an earlier line puts it back in the prompt.
Definitions, history and `ans` are kept in `localStorage`, so they are still there next time.

## Tests

```
node test/run.js
```

runs the parser in a bare `vm` context (no browser) against a table of expressions, and exits non-zero on any failure.
