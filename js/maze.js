/* ======================================================================
   Maze Generator
   Depth-first backtracking maze builder.
   Output: line walls that game.js converts into real obstacles.
====================================================================== */
class MazeGenerator{
static generate(cols,rows){
    // Build cell grid
    let grid=[];
    for(let r=0;r<rows;r++){
        let row=[];
        for(let c=0;c<cols;c++)
            row.push({x:c,y:r,visited:false,walls:{top:true,right:true,bottom:true,left:true}});
        grid.push(row);
    }

    // DFS stack
    let stack=[grid[0][0]];
    stack[0].visited=true;

    while(stack.length){
        let cur=stack.at(-1),{x,y}=cur;
        let N=[]; // unvisited neighbors

        if(y>0&&!grid[y-1][x].visited)N.push(grid[y-1][x]);
        if(x<cols-1&&!grid[y][x+1].visited)N.push(grid[y][x+1]);
        if(y<rows-1&&!grid[y+1][x].visited)N.push(grid[y+1][x]);
        if(x>0&&!grid[y][x-1].visited)N.push(grid[y][x-1]);

        if(N.length){
            let nxt=N[Math.random()*N.length|0];
            // Remove shared wall between current and next
            if(nxt.x>cur.x)cur.walls.right=false,nxt.walls.left=false;
            else if(nxt.x<cur.x)cur.walls.left=false,nxt.walls.right=false;
            else if(nxt.y>cur.y)cur.walls.bottom=false,nxt.walls.top=false;
            else cur.walls.top=false,nxt.walls.bottom=false;

            nxt.visited=true; stack.push(nxt);
        } else stack.pop();
    }

    // Convert grid walls into renderable lines
    let walls=[],breakChance=0.35;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        let cell=grid[r][c];
        // Right wall
        if(c<cols-1 && cell.walls.right && Math.random()>breakChance)
         walls.push({x1:(c+1)/cols,y1:r/rows,x2:(c+1)/cols,y2:(r+1)/rows,type:Math.random()>0.9?'glass':'mirror'});
        // Bottom wall
        if(r<rows-1 && cell.walls.bottom && Math.random()>breakChance)
         walls.push({x1:c/cols,y1:(r+1)/rows,x2:(c+1)/cols,y2:(r+1)/rows,type:Math.random()>0.9?'glass':'mirror'});
      }
    }
    return walls;
}}
