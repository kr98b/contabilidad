const { port, dbhost, dbuser, dbpass, dbport, dbname } = require('./config.js');

const os = require('os');
const express = require('express');
const path = require('path');
const app = express();

// Get the hostname
const hostname = os.hostname();
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

app.get('/getHostname', (req, res) => {
  const hostname = os.hostname();
  res.json({ hostname, origin: `${req.protocol}://${req.get('host')}` });
});

const pg = require('pg');
const connection = `postgresql://${dbuser}:${dbpass}@${dbhost}/${dbname}`;

function doConnect() {
  client.connect(err => {
    if (err) {
      console.error('Function Error:', err);
      reject(err);
      return;
    }
  });
}

function doSelect() {
  return new Promise((resolve, reject) => {
    const client = new pg.Client(connection);

    client.connect(err => {
      if (err) {
        console.error('Function Error:', err);
        reject(err);
        return;
      }

      client.query('SELECT * FROM credenciales', [], (err, data) => {
        if (err) {
          console.error('Function Error:', err);
          reject(err);
        } else {
          console.log('Function Response:', data.rows);
          resolve(data.rows);
        }
        client.end();
      });
    });
  });
}

app.get('/doSelect', async (req, res) => {
  try {
    const data = await doSelect();
    res.json(data);
  } catch (err) {
    console.error('API Error', err);
    res.status(500).json({ error: 'API Error', details: err.message });
  }
});


app.get('/doConnect', async (req, res) => {
  try {
    const data = await doConnect();
    res.json(data);
  } catch (err) {
    console.error('API Error', err);
    res.status(500).json({ error: 'API Error', details: err.message });
  }
});