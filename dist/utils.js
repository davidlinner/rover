"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randn_bm = void 0;
function randn_bm(min, max, skew = 1) {
    let u = 0, v = 0;
    while (u === 0)
        u = Math.random();
    while (v === 0)
        v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5;
    if (num > 1 || num < 0)
        num = randn_bm(min, max, skew);
    num = Math.pow(num, skew);
    num *= max - min;
    num += min;
    return num;
}
exports.randn_bm = randn_bm;
