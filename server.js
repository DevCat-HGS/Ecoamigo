const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Sistema de Logging más eficiente
class Logger {
    constructor() {
        this.logPath = path.join(__dirname, 'logs');
        if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath);
        }
        // Buffer para almacenar logs antes de escribir
        this.buffer = [];
        this.bufferSize = 10;
    }

    log(type, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = JSON.stringify({
            timestamp,
            type,
            message,
            data
        }) + '\n';

        // Agregar al buffer
        this.buffer.push(logEntry);

        // Escribir en consola
        console.log(`[${type.toUpperCase()}] ${message}`, data);

        // Si el buffer está lleno, escribir en archivo
        if (this.buffer.length >= this.bufferSize) {
            this.flushBuffer(type);
        }
    }

    flushBuffer(type) {
        if (this.buffer.length > 0) {
            const logFile = path.join(this.logPath, `${type}-${new Date().toISOString().split('T')[0]}.log`);
            fs.appendFileSync(logFile, this.buffer.join(''));
            this.buffer = [];
        }
    }

    error(message, error) {
        this.log('error', message, {
            error: error.message,
            stack: error.stack
        });
        this.flushBuffer('error'); // Forzar escritura inmediata para errores
    }

    info(message, data) {
        this.log('info', message, data);
    }

    debug(message, data) {
        this.log('debug', message, data);
    }
}

const logger = new Logger();

// Middleware para logging de requests importantes
app.use((req, res, next) => {
    // Solo logear rutas API
    if (req.path.startsWith('/api')) {
        logger.info('API Request', {
            method: req.method,
            path: req.path,
            query: req.query
        });
    }
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Application Error', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// URI de conexión a MongoDB
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
const dbName = "ecoamigoDB";

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Conectar a MongoDB con debug
async function conectarDB() {
    try {
        await client.connect();
        logger.info("Conectado a MongoDB exitosamente");
    } catch (error) {
        logger.error("Error conectando a MongoDB", error);
        process.exit(1);
    }
}

conectarDB();

// Wrapper para manejar errores en rutas async
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
        logger.error('Route Error', err);
        next(err);
    });
};

// CRUD para Tests con debug
app.post('/api/tests', asyncHandler(async (req, res) => {
    const collection = client.db(dbName).collection("tests");
    logger.debug('Creando nuevo test', req.body);
    const resultado = await collection.insertOne(req.body);
    logger.info('Test creado exitosamente', { id: resultado.insertedId });
    res.json(resultado);
}));

app.get('/api/tests', asyncHandler(async (req, res) => {
    const collection = client.db(dbName).collection("tests");
    logger.debug('Obteniendo tests');
    const tests = await collection.find({}).toArray();
    logger.info('Tests recuperados', { count: tests.length });
    res.json(tests);
}));

app.put('/api/tests/:id', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("tests");
        const resultado = await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tests/:id', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("tests");
        const resultado = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD para Seguimientos
app.post('/api/seguimientos', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("seguimientos");
        const seguimiento = {
            ...req.body,
            fecha: new Date(),
            cumplido: false
        };
        const resultado = await collection.insertOne(seguimiento);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/seguimientos', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("seguimientos");
        const seguimientos = await collection.find({}).toArray();
        res.json(seguimientos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/seguimientos/:id', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("seguimientos");
        const resultado = await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/seguimientos/:id', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("seguimientos");
        const resultado = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD para Mensajes de la Comunidad
app.post('/api/mensajes', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("mensajes");
        const mensaje = {
            ...req.body,
            fecha: new Date(),
            likes: 0
        };
        const resultado = await collection.insertOne(mensaje);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/mensajes', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("mensajes");
        const mensajes = await collection.find({}).sort({ fecha: -1 }).toArray();
        res.json(mensajes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/mensajes/:id', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("mensajes");
        const resultado = await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/mensajes/:id', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("mensajes");
        const resultado = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD para Consejos
app.post('/api/consejos', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("consejos");
        const consejo = {
            ...req.body,
            fecha: new Date()
        };
        const resultado = await collection.insertOne(consejo);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/consejos', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("consejos");
        const consejos = await collection.find({}).toArray();
        res.json(consejos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/consejos/:id', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("consejos");
        const resultado = await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/consejos/:id', async (req, res) => {
    try {
        const collection = client.db(dbName).collection("consejos");
        const resultado = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar el setInterval de monitoreo y reemplazarlo por un middleware de rendimiento
app.use((req, res, next) => {
    const start = process.hrtime();
    
    res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000;
        
        if (duration > 1000) { // Solo logear respuestas lentas (más de 1 segundo)
            logger.debug('Respuesta lenta', {
                path: req.path,
                duration: `${duration.toFixed(2)}ms`
            });
        }
    });
    
    next();
});

app.listen(port, () => {
    logger.info(`Servidor iniciado en http://localhost:${port}`);
}); 