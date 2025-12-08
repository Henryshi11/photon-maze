// Main launcher for Photon Maze
// Handles session resume (return from button punishment)

const game = new PhotonGame();

window.addEventListener("load", () => {
    const query = new URLSearchParams(window.location.search);

    // Returned from punishment mode → reset death count only
    if(query.get("resume") === "true"){
        game.attempts = 0;
        document.getElementById("attempts-txt").innerText = "0";
        console.log("Player resumed from button challenge.");
    }
});
