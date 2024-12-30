const express = require('express');
const path = require('path');
const app = express();
const port = 3001;

const fs = require('fs');

app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
