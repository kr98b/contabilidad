const { port, dbhost, dbuser, dbpass, dbport, dbname, ssl } = require('./config.js');

const os = require('os');
const express = require('express');
const path = require('path');
const app = express();

const hostname = os.hostname();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.listen(port, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

const pg = require('pg');
const connection = `postgresql://${dbuser}:${dbpass}@${dbhost}/${dbname}`;

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

function registerProject(data) {
  return new Promise((resolve, reject) => {
    const client = new pg.Client(connection);

    client.connect(err => {
      if (err) {
        console.error('Error Funcion:', err);
        reject(err);
        return;
      }

      // Extract data
      const info_datos = data['datos'];
      const info_productos = data['productos'];
      const info_departamentos = data['departamentos'];
      const info_materia_prima = data['materia_prima'];

      const { projectName, company, rent, electricity, maintenance } = info_datos;

      const insertProyectoQuery = `
        INSERT INTO proyecto (nombre, empresa, renta, luz, mantenimiento_mtto)
        VALUES ($1, $2, $3, $4, $5) RETURNING id_proyecto;
      `;

      client.query(insertProyectoQuery, [projectName, company, rent, electricity, maintenance], (err, result) => {
        if (err) {
          console.error('Error inserting into proyecto table:', err);
          reject(err);
          return;
        }

        const projectId = result.rows[0].id_proyecto;  // Get the inserted project ID
        console.log('Inserted project with ID:', projectId);

        // Prepare promises for each insert query to ensure all are executed before closing the connection
        const promises = [];

        // Step 2: Insert into 'productos' table
        const insertProductosQuery = `
          INSERT INTO productos (id_proyecto, nombre)
          VALUES ($1, $2);
        `;
        
        info_productos.forEach(product => {
          promises.push(
            client.query(insertProductosQuery, [projectId, product])
              .then(() => {
                console.log('Inserted product:', product);
              })
              .catch(err => {
                console.error('Error inserting into productos table:', err);
                reject(err);
              })
          );
        });

        // Step 3: Insert into 'departamento' table
        const insertDepartamentoQuery = `
          INSERT INTO departamento (id_proyecto, nombre, metros_cuadrados, kilowatts, horas_maquina, moi, mpi)
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `;

        info_departamentos.forEach(department => {
          const { name, area, kilowatts, machineHours, laborCost, materialCost } = department;

          promises.push(
            client.query(insertDepartamentoQuery, [
              projectId,
              name,
              area,
              kilowatts,
              machineHours,
              laborCost,
              materialCost
            ])
            .then(() => {
              console.log('Inserted department:', name);
            })
            .catch(err => {
              console.error('Error inserting into departamento table:', err);
              reject(err);
            })
          );
        });

        // Step 4: Insert into 'materia_prima' table
        const insertMateriaPrimaQuery = `
          INSERT INTO materia_prima (id_proyecto, nombre, metodo)
          VALUES ($1, $2, $3);
        `;

        info_materia_prima.forEach(material => {
          const { name, method } = material;

          promises.push(
            client.query(insertMateriaPrimaQuery, [
              projectId,
              name,
              method.toLowerCase()
            ])
            .then(() => {
              console.log('Inserted raw material:', name);
            })
            .catch(err => {
              console.error('Error inserting into materia_prima table:', err);
              reject(err);
            })
          );
        });

        // Wait for all promises to finish before closing the connection
        Promise.all(promises)
          .then(() => {
            resolve(1);
            client.end();
          })
          .catch(err => {
            console.error('Error completing all queries:', err);
            reject(err);
            client.end();
          });
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

app.post('/registerProject', async (req, res) => {
  try {
    const data = req.body;

    const result = await registerProject(data);

    res.json({ message: result });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'API Error', details: err.message });
  }
});