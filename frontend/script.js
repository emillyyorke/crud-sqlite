document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const taskList = document.getElementById('taskList');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskModal = document.getElementById('taskModal');
    const closeBtn = document.querySelector('.close-btn');
    const taskForm = document.getElementById('taskForm');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const totalTasksEl = document.getElementById('total-tasks');
    const pendingTasksEl = document.getElementById('pending-tasks');
    const completedTasksEl = document.getElementById('completed-tasks');
    
    let currentFilter = 'all';
    let currentSearch = '';
    
    // Event Listeners
    addTaskBtn.addEventListener('click', openAddTaskModal);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', outsideClick);
    taskForm.addEventListener('submit', handleTaskSubmit);
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            loadTasks();
        });
    });
    
    // Carregar tarefas ao iniciar
    loadTasks();
    
    // Funções
    
    function openAddTaskModal() {
        console.log('Abrindo modal de nova tarefa');
        document.getElementById('modalTitle').textContent = 'Nova Tarefa';
        document.getElementById('taskId').value = '';
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDescription').value = '';
        document.getElementById('taskStatus').value = 'pendente';
        taskModal.style.display = 'block';
    }
    
    function openEditTaskModal(task) {
        document.getElementById('modalTitle').textContent = 'Editar Tarefa';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.titulo;
        document.getElementById('taskDescription').value = task.descricao || '';
        document.getElementById('taskStatus').value = task.status;
        taskModal.style.display = 'block';
    }
    
    function closeModal() {
        taskModal.style.display = 'none';
    }
    
    function outsideClick(e) {
        if (e.target === taskModal) {
            closeModal();
        }
    }
    
    function handleTaskSubmit(e) {
        e.preventDefault();
        
        const taskId = document.getElementById('taskId').value;
        const taskData = {
            titulo: document.getElementById('taskTitle').value,
            descricao: document.getElementById('taskDescription').value,
            status: document.getElementById('taskStatus').value
        };
        
        if (!taskData.titulo) {
            alert('O título da tarefa é obrigatório!');
            return;
        }
        
        if (taskId) {
            updateTask(taskId, taskData);
        } else {
            createTask(taskData);
        }
    }
    
    function handleSearch() {
        currentSearch = searchInput.value.trim().toLowerCase();
        loadTasks();
    }
    
    // Funções para interação com a API
    
    async function loadTasks() {
        try {
            taskList.innerHTML = '<div class="loading">Carregando tarefas...</div>';
            
            const response = await fetch('http://localhost:3000/tarefas');
            const tasks = await response.json();
            
            // Aplicar filtros
            let filteredTasks = tasks;
            
            if (currentFilter !== 'all') {
                filteredTasks = tasks.filter(task => task.status === currentFilter);
            }
            
            if (currentSearch) {
                filteredTasks = filteredTasks.filter(task => 
                    task.titulo.toLowerCase().includes(currentSearch) || 
                    (task.descricao && task.descricao.toLowerCase().includes(currentSearch))
                );
            }
            
            // Ordenar por data de criação (mais recente primeiro)
            filteredTasks.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
            
            // Atualizar estatísticas
            updateStats(tasks);
            
            // Exibir tarefas
            displayTasks(filteredTasks);
        } catch (error) {
            console.error('Erro ao carregar tarefas:', error);
            taskList.innerHTML = '<div class="error">Erro ao carregar tarefas. Recarregue a página.</div>';
        }
    }
    
    function displayTasks(tasks) {
        if (tasks.length === 0) {
            taskList.innerHTML = '<p class="no-tasks">Nenhuma tarefa encontrada.</p>';
            return;
        }
        
        taskList.innerHTML = '';
        
        tasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = `task-card ${task.status}`;
            
            const formattedDate = new Date(task.data_criacao).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            taskCard.innerHTML = `
                <div class="task-header">
                    <h3 class="task-title">${task.titulo}</h3>
                    <span class="task-status status-${task.status}">${task.status}</span>
                </div>
                ${task.descricao ? `<p class="task-description">${task.descricao}</p>` : ''}
                <div class="task-footer">
                    <span class="task-date">Criada em: ${formattedDate}</span>
                    <div class="task-actions">
                        <button class="btn btn-secondary edit-btn" data-id="${task.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger delete-btn" data-id="${task.id}">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            `;
            
            taskList.appendChild(taskCard);
        });
        
        // Adicionar event listeners aos botões de editar e excluir
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const taskId = this.dataset.id;
                getTaskById(taskId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const taskId = this.dataset.id;
                if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                    deleteTask(taskId);
                }
            });
        });
    }
    
    function updateStats(tasks) {
        totalTasksEl.textContent = tasks.length;
        pendingTasksEl.textContent = tasks.filter(t => t.status === 'pendente').length;
        completedTasksEl.textContent = tasks.filter(t => t.status === 'concluída').length;
    }
    
    async function getTaskById(id) {
        try {
            const response = await fetch(`http://localhost:3000/tarefas/${id}`);
            const task = await response.json();
            openEditTaskModal(task);
        } catch (error) {
            console.error('Erro ao buscar tarefa:', error);
            alert('Erro ao buscar tarefa. Por favor, tente novamente.');
        }
    }
    
    async function createTask(taskData) {
        try {
            const response = await fetch('http://localhost:3000/tarefas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData)
            });
            
            if (response.ok) {
                closeModal();
                loadTasks();
            } else {
                throw new Error('Erro ao criar tarefa');
            }
        } catch (error) {
            console.error('Erro ao criar tarefa:', error);
            alert('Erro ao criar tarefa. Por favor, tente novamente.');
        }
    }
    
    async function updateTask(id, taskData) {
        try {
            const response = await fetch(`http://localhost:3000/tarefas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData)
            });
            
            if (response.ok) {
                closeModal();
                loadTasks();
            } else {
                throw new Error('Erro ao atualizar tarefa');
            }
        } catch (error) {
            console.error('Erro ao atualizar tarefa:', error);
            alert('Erro ao atualizar tarefa. Por favor, tente novamente.');
        }
    }
    
    async function deleteTask(id) {
        try {
            const response = await fetch(`http://localhost:3000/tarefas/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadTasks();
            } else {
                throw new Error('Erro ao excluir tarefa');
            }
        } catch (error) {
            console.error('Erro ao excluir tarefa:', error);
            alert('Erro ao excluir tarefa. Por favor, tente novamente.');
        }
    }
});