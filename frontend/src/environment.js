let is_production = true;

const server = is_production ? 
    "https://linkmeetbackend-mygx.onrender.com"
    : "http://localhost:8000"

export default server;