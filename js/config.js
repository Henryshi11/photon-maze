/* ======================================================================
   Global Game Configuration
   (Material properties, bounce limits and UI color theme)
====================================================================== */

const CONFIG = {
    // Reflection bounce count limits
    defaultMaxBounces: 20,      // static puzzle levels
    complexMaxBounces: 150,     // maze/procedural levels

    // Refraction indexes for Snell's law
    refractiveIndex: 1.5,       // inside glass
    airIndex: 1.0,              // surrounding medium

    // Rendering colors
    colors: {
        active: '#fff',         // current ray
        shot1: '#ffd400',
        shot2: '#ff9a00',
        shot3: '#ff4e4e',
        old:  '#442244',
        wall:'#00ccff',
        glass:'rgba(200,255,255,0.3)',
        absorb:'#333'
    }
};
