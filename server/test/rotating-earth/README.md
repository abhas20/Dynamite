# Rotating Earth

A simple web application demonstrating a rotating 3D Earth using HTML, CSS, and JavaScript with the Three.js library.

## Features

*   3D Earth model rendered using WebGL.
*   Continuous rotation of the Earth.
*   Interactive camera controls (zoom, pan, rotate) using OrbitControls.
*   Responsive design, adjusting to different screen sizes.

## Setup Instructions

1.  **Clone the repository (or create the files manually as provided).**
2.  **Navigate to the project directory:**
    ```bash
    cd rotating-earth
    ```
3.  **Install dependencies:**
    This project uses `npm` to manage the `three.js` library and a simple local server `http-server`.
    ```bash
    npm install
    ```

## Running the Application

1.  **Start the local server:**
    ```bash
    npm start
    ```
2.  **Open your web browser** and navigate to `http://localhost:8080` (or the address provided in your terminal).

## Adding Earth Texture (Optional but Recommended)

For a more realistic look, you can add a texture to the Earth. 

1.  **Create a `textures` folder** in the root of the project:
    ```bash
    mkdir textures
    ```
2.  **Download a suitable Earth daymap texture image.** For example, you can find high-quality textures on NASA's website or similar sources. A common resolution is 2048x1024 pixels.
    *   Example search term: "earth daymap texture 2048x1024"
3.  **Save the texture image** inside the `textures` folder, naming it `earth_daymap.jpg`.
    *   `rotating-earth/textures/earth_daymap.jpg`

The `script.js` file is already set up to load this texture if it exists.

## Technologies Used

*   HTML5
*   CSS3
*   JavaScript (ES6+)
*   Three.js (for 3D rendering)
*   http-server (for local development server)
