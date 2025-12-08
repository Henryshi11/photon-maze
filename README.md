# 🔦 Photon Maze — A Light Reflection & Refraction Puzzle Game  

**Live Demo:** 👉 https://henryshi11.github.io/photon-maze  
> A browser-based physics puzzle game where you guide a beam of light through mirrors, glass prisms and procedural mazes.  
> Built with **HTML + CSS + JavaScript (Canvas)**, no framework required.  

---

## 🧠 Game Concept

This project simulates light behavior using **ray tracing** on 2D surfaces:

- Mirrors reflect the beam  
- Glass segments refract it using Snell's law  
- Boundaries contain the light inside the maze  
- Target node must be hit with minimal path length  

Your goal is simple:  
**Find an angle to shoot the ray and reach the target with the shortest path.**

The game starts with handcrafted tutorial levels and gradually shifts into **procedurally generated complex mazes**.

---

## 🎮 Gameplay

| Action | Description |
|-------|-------------|
| **Click anywhere on the canvas** | Shoot a light ray toward the cursor direction |
| **Hit the target** 🎯 | Win the level |
| **RESET** | Reloads the level & generates a new maze layout |
| **CLEAR TRAILS** | Removes ray history without regenerating the map |
| **Next Level** | Progress to harder puzzles & random labyrinths |

---

## 💥 Fun Feature — Failure Punishment Mini-Game

If you fail **10 times in a row**, the maze won't let you continue.  
Instead, you'll be thrown into a **"Hit The Button" mini-game**.

Beat it → return to the maze.  
Fail → suffer psychological damage 😆

A playful mechanic that keeps challenge high.

---

## 🔧 Tech Stack

- **HTML5 Canvas Rendering**
- **JavaScript (No libraries required)**
- Custom **ray collision math**
- **Snell's Law refraction**
- **Procedural maze generation**
- Modular structure:

