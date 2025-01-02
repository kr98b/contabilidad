const { port, dbhost, dbuser, dbpass, dbport, dbname } = require('./config.js');

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
const connection = `postgresql://${dbuser}:${dbpass}@${dbhost}/${dbname}?ssl=true`;

function doSelect() {
  return new Promise((resolve, reject) => {
    const client = new pg.Client(connection);

    client.connect(err => {
      if (err) {
        console.error('Connection Error:', err);
        reject(err);
        return;
      }

      const queries = [
        { key: 'producto', query: 'SELECT * FROM producto WHERE id_producto = 5' },
        { key: 'real', query: 'SELECT * FROM real WHERE id_producto = 5' },
        { key: 'estandar', query: 'SELECT * FROM estandar WHERE id_producto = 5' },
        { key: 'datos_tarjeta_almacen', query: 'SELECT * FROM datos_tarjeta_almacen WHERE id_producto = 5' },
      ];

      const results = {};

      Promise.all(
        queries.map(({ key, query }) =>
          client.query(query).then(res => ({ key, rows: res.rows }))
        )
      )
        .then(responses => {
          responses.forEach(({ key, rows }) => {
            results[key] = rows;
          });
          console.log('Response:', results);
          resolve(results);
        })
        .catch(err => {
          console.error('Query Error:', err);
          reject(err);
        })
        .finally(() => {
          client.end();
        });
    });
  });
}

function registerProduct(data) {
  return new Promise((resolve, reject) => {
    const client = new pg.Client(connection);

    client.connect(err => {
      if (err) {
        console.error('Error Funcion:', err);
        reject(err);
        return;
      }

      const {
        producto, kilos, precioKilo, horasMano, precioHoraHombre, cargosIndirectos, cargosFijos, precioHoraMaquina,
        compraMateria, costoCompra, consumoMateria, costoModHoras, costoHoraMod, cargosIndirectosVariables, cargosIndirectosFijos,
        unidadesVendidas, precioUnitario, gastosVenta, gastosAdmon, productosTerminados, productosEnProceso,
        unidadesPresupuestoEstatico, costoPresupuestoEstatico, saldoInicial, compras, salidas
      } = data;

      // Insert into 'Producto' table
      const insertProductoQuery = `
        INSERT INTO Producto (nombre)
        VALUES ($1) RETURNING id_producto;
      `;

      client.query(insertProductoQuery, [producto], (err, result) => {
        if (err) {
          console.error('Error inserting into Producto table:', err);
          reject(err);
          client.end();
          return;
        }

        const productoId = result.rows[0].id_producto;  // Get the inserted product ID
        console.log('Inserted product with ID:', productoId);

        // Insert into 'Estandar' table
        const insertEstandarQuery = `
          INSERT INTO Estandar (id_producto, kilos_mp_e, costo_kilos_mp_e, horas_mod_e, costo_mod_e, cargos_indirectos_e, 
          costo_cargos_indirectos_e, costo_horas_maquina_civ_e)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `;

        client.query(insertEstandarQuery, [
          productoId, kilos, precioKilo, horasMano, precioHoraHombre, cargosIndirectos, cargosFijos, precioHoraMaquina
        ], (err) => {
          if (err) {
            console.error('Error inserting into Estandar table:', err);
            reject(err);
            client.end();
            return;
          }

          // Insert into 'Real' table
          const insertRealQuery = `
            INSERT INTO Real (id_producto, kilos_mp_r, costo_kilos_mp_r, consumo_mp_r, costo_mod_r, costo_hora_r, cargos_indir_inc_var_r,
            cargos_indir_inc_fijos_r, unid_vendidas_r, precio_venta_r, gastos_venta_r, gastos_admon_r, prod_terminado_r, 
            prod_proceso_r, prep_est_unidades_r, prep_est_costo_r)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);
          `;

          client.query(insertRealQuery, [
            productoId, compraMateria, costoCompra, consumoMateria, costoModHoras, costoHoraMod, cargosIndirectosVariables,
            cargosIndirectosFijos, unidadesVendidas, precioUnitario, gastosVenta, gastosAdmon, productosTerminados, productosEnProceso,
            unidadesPresupuestoEstatico, costoPresupuestoEstatico
          ], (err) => {
            if (err) {
              console.error('Error inserting into Real table:', err);
              reject(err);
              client.end();
              return;
            }

            // Insert into 'datos_tarjeta_almacen' table
            const insertDatosTarjetaQuery = `
              INSERT INTO datos_tarjeta_almacen (id_producto, saldo_inicial, compras, salidas)
              VALUES ($1, $2, $3, $4);
            `;

            client.query(insertDatosTarjetaQuery, [productoId, saldoInicial, compras, salidas], (err) => {
              if (err) {
                console.error('Error inserting into datos_tarjeta_almacen table:', err);
                reject(err);
                client.end();
                return;
              }

              console.log('All data inserted successfully.');
              resolve(1);
              client.end();
            });
          });
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

app.post('/registerProduct', async (req, res) => {
  try {
    const data = req.body;

    const result = await registerProduct(data);

    res.json({ message: result });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'API Error', details: err.message });
  }
});

/*
function registerProject(data) {
  return new Promise((resolve, reject) => {
    const client = new pg.Client(connection);

    client.connect(err => {
      if (err) {
        console.error('Error Funcion:', err);
        reject(err);
        return;
      }

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
*/