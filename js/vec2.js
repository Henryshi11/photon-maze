/* ======================================================================
   2D Vector Utility Module
   Math helper functions used throughout the ray tracer
====================================================================== */
const Vec2 = {
    add:(a,b)=>({x:a.x+b.x,y:a.y+b.y}),
    sub:(a,b)=>({x:a.x-b.x,y:a.y-b.y}),
    mult:(v,n)=>({x:v.x*n,y:v.y*n}),
    dot:(a,b)=>a.x*b.x + a.y*b.y,
    mag:v=>Math.hypot(v.x,v.y),
    normalize:v=>{
        const m=Math.hypot(v.x,v.y);
        return m?{x:v.x/m,y:v.y/m}:{x:0,y:0};
    },
    dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
};
