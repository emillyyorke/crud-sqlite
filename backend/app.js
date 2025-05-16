const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Configuração do banco de dados SQLite
const dbPath = path.join(__dirname, 'db', 'tarefas.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.run(`CREATE TABLE IF NOT EXISTS tarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            status TEXT DEFAULT 'pendente',
            data_criacao TEXT DEFAULT CURRENT_TIMESTAMP,
            data_conclusao TEXT
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela:', err.message);
            } else {
                console.log('Tabela "tarefas" verificada/criada com sucesso');
            }
        });
    }
});

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Rotas CRUD para Tarefas

// Listar todas as tarefas
app.get('/tarefas', (req, res) => {
    db.all('SELECT * FROM tarefas ORDER BY data_criacao DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Obter uma tarefa específica
app.get('/tarefas/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM tarefas WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ message: 'Tarefa não encontrada' });
            return;
        }
        res.json(row);
    });
});

// Criar nova tarefa
app.post('/tarefas', (req, res) => {
    const { titulo, descricao, status } = req.body;
    if (!titulo) {
        res.status(400).json({ error: 'Título é obrigatório' });
        return;
    }

    db.run(
        'INSERT INTO tarefas (titulo, descricao, status) VALUES (?, ?, ?)',
        [titulo, descricao, status || 'pendente'],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({ 
                id: this.lastID,
                titulo,
                descricao,
                status: status || 'pendente'
            });
        }
    );
});

// Atualizar tarefa
app.put('/tarefas/:id', (req, res) => {
    const id = req.params.id;
    const { titulo, descricao, status } = req.body;
    
    db.get('SELECT * FROM tarefas WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ message: 'Tarefa não encontrada' });
            return;
        }

        const updateData = {
            titulo: titulo !== undefined ? titulo : row.titulo,
            descricao: descricao !== undefined ? descricao : row.descricao,
            status: status !== undefined ? status : row.status,
            data_conclusao: status === 'concluída' && row.status !== 'concluída' 
                ? new Date().toISOString() 
                : status !== 'concluída' ? null : row.data_conclusao
        };

        db.run(
            'UPDATE tarefas SET titulo = ?, descricao = ?, status = ?, data_conclusao = ? WHERE id = ?',
            [updateData.titulo, updateData.descricao, updateData.status, updateData.data_conclusao, id],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({
                    id,
                    ...updateData
                });
            }
        );
    });
});

// Deletar tarefa
app.delete('/tarefas/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM tarefas WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ message: 'Tarefa não encontrada' });
            return;
        }
        res.json({ message: 'Tarefa deletada com sucesso' });
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});