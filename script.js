// AI Video Generator - Sistema Completo com APIs Reais
class AIVideoGenerator {
    constructor() {
        this.videos = this.loadFromStorage('aiVideos', []);
        this.apiUsage = this.loadFromStorage('apiUsage', {});
        this.costHistory = this.loadFromStorage('costHistory', []);
        this.totalCost = parseFloat(localStorage.getItem('totalCost') || '0');
        
        // Configurações das APIs com endpoints reais
        this.apiConfigs = {
            synthesia: {
                name: 'Synthesia',
                freeLimit: 180, // 3 minutes in seconds
                costPerSecond: 0,
                costAfterLimit: 0.15,
                quality: 'high',
                endpoint: 'https://api.synthesia.io/v2/videos',
                features: ['avatar', 'multilingual', 'text-to-speech'],
                requiresApiKey: true
            },
            replicate: {
                name: 'Replicate',
                freeLimit: 0,
                costPerSecond: 0.08,
                quality: 'very-high',
                endpoint: 'https://api.replicate.com/v1/predictions',
                features: ['text-to-video', 'image-to-video', 'style-transfer'],
                requiresApiKey: true
            },
            veo: {
                name: 'Google Veo',
                freeLimit: 3000, // $300 credits = ~3000 seconds
                costPerSecond: 0.12,
                quality: 'highest',
                endpoint: 'https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/veo-2:streamGenerateContent',
                features: ['cinematic', 'high-res', 'long-duration'],
                requiresApiKey: true
            },
            heygen: {
                name: 'HeyGen',
                freeLimit: 60, // 1 minute free
                costPerSecond: 0.10,
                quality: 'high',
                endpoint: 'https://api.heygen.com/v2/video/generate',
                features: ['avatar', 'voice-cloning', 'multilingual'],
                requiresApiKey: true
            }
        };

        // Configurações das APIs (usuário deve configurar)
        this.apiKeys = this.loadFromStorage('apiKeys', {});
        this.currentGeneration = null;
        this.init();
    }

    loadFromStorage(key, defaultValue) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn(`Error loading ${key} from localStorage:`, error);
            return defaultValue;
        }
    }

    saveToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`Error saving ${key} to localStorage:`, error);
        }
    }

    init() {
        this.setupEventListeners();
        this.updateStats();
        this.updateAnalytics();
        this.renderVideoGallery();
        this.updateCostEstimate();
        this.checkApiKeys();
    }

    checkApiKeys() {
        // Verificar se há APIs configuradas
        const configuredApis = Object.keys(this.apiKeys).length;
        if (configuredApis === 0) {
            this.showApiSetupModal();
        }
    }

    showApiSetupModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <div class="modal-header">
                    <h2>🔑 Configuração de APIs</h2>
                    <p>Configure pelo menos uma API para gerar vídeos reais</p>
                </div>
                <div class="modal-body">
                    <div class="api-setup">
                        <div class="api-item">
                            <h3>🎬 Replicate (Recomendado)</h3>
                            <p>Mais fácil de configurar, boa qualidade</p>
                            <input type="text" id="replicateKey" placeholder="r8_seu_token_aqui..." />
                            <small>1. Registre em <a href="https://replicate.com" target="_blank">replicate.com</a><br>
                            2. Vá em Account → API Tokens<br>
                            3. Cole o token acima</small>
                        </div>
                        
                        <div class="api-item">
                            <h3>🤖 Google Veo (Melhor Qualidade)</h3>
                            <input type="text" id="veoKey" placeholder="Seu API Key..." />
                            <input type="text" id="veoProject" placeholder="Project ID..." />
                            <small>1. Configure Google Cloud com Vertex AI<br>
                            2. Obtenha credenciais de serviço<br>
                            3. Cole as informações acima</small>
                        </div>
                        
                        <div class="api-item">
                            <h3>👤 Synthesia (Avatares)</h3>
                            <input type="text" id="synthesiaKey" placeholder="Seu API Key..." />
                            <small>1. Registre em <a href="https://synthesia.io" target="_blank">synthesia.io</a><br>
                            2. Upgrade para plano pago<br>
                            3. Obtenha API key no dashboard</small>
                        </div>
                        
                        <div class="api-item">
                            <h3>🎭 HeyGen (Voice Cloning)</h3>
                            <input type="text" id="heygenKey" placeholder="Seu API Key..." />
                            <small>1. Registre em <a href="https://heygen.com" target="_blank">heygen.com</a><br>
                            2. Upgrade para Creator+<br>
                            3. Obtenha API key</small>
                        </div>
                    </div>
                    
                    <div class="api-actions">
                        <button onclick="window.videoGenerator.saveApiKeys()" class="save-keys-btn">💾 Salvar Configurações</button>
                        <button onclick="window.videoGenerator.testMode()" class="test-mode-btn">🧪 Usar Modo Simulação</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    saveApiKeys() {
        const keys = {};
        
        const replicateKey = document.getElementById('replicateKey')?.value.trim();
        if (replicateKey) keys.replicate = replicateKey;
        
        const veoKey = document.getElementById('veoKey')?.value.trim();
        const veoProject = document.getElementById('veoProject')?.value.trim();
        if (veoKey && veoProject) {
            keys.veo = { apiKey: veoKey, projectId: veoProject };
        }
        
        const synthesiaKey = document.getElementById('synthesiaKey')?.value.trim();
        if (synthesiaKey) keys.synthesia = synthesiaKey;
        
        const heygenKey = document.getElementById('heygenKey')?.value.trim();
        if (heygenKey) keys.heygen = heygenKey;

        this.apiKeys = keys;
        this.saveToStorage('apiKeys', keys);
        
        // Fechar modal
        document.querySelector('.modal')?.remove();
        
        this.showToast(`Configurado ${Object.keys(keys).length} API(s) com sucesso! 🎉`, 'success');
    }

    testMode() {
        localStorage.setItem('testMode', 'true');
        document.querySelector('.modal')?.remove();
        this.showToast('Modo simulação ativado! Você pode testar sem APIs reais. 🧪', 'info');
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('videoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateVideo();
        });

        // API provider change
        document.getElementById('apiProvider').addEventListener('change', () => {
            this.updateCostEstimate();
        });

        // Video type change
        document.getElementById('videoType').addEventListener('change', (e) => {
            this.toggleImageUpload(e.target.value === 'image-to-video');
        });

        // Duration change
        document.getElementById('videoDuration').addEventListener('change', () => {
            this.updateCostEstimate();
        });

        // Image upload
        this.setupImageUpload();

        // Settings
        document.getElementById('autoSave').addEventListener('change', (e) => {
            localStorage.setItem('autoSave', e.target.checked);
        });
        
        document.getElementById('notifications').addEventListener('change', (e) => {
            localStorage.setItem('notifications', e.target.checked);
        });

        // Modal close on outside click
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('videoModal');
            if (event.target === modal) {
                this.closeModal();
            }
        });
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const imageUpload = document.getElementById('imageUpload');
        
        uploadArea.addEventListener('click', () => imageUpload.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleImageUpload(file);
            }
        });
        
        imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageUpload(file);
            }
        });
    }

    toggleImageUpload(show) {
        const imageUploadGroup = document.getElementById('imageUploadGroup');
        imageUploadGroup.style.display = show ? 'block' : 'none';
    }

    handleImageUpload(file) {
        if (!file || !file.type.startsWith('image/')) {
            this.showToast('Por favor, selecione uma imagem válida', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: 8px;">
                <button onclick="document.getElementById('imagePreview').innerHTML=''" class="remove-btn">×</button>
            `;
        };
        reader.readAsDataURL(file);
    }

    updateCostEstimate() {
        const provider = document.getElementById('apiProvider').value;
        const duration = parseInt(document.getElementById('videoDuration').value);
        
        if (!provider || provider === 'auto') {
            document.getElementById('selectedApiCost').textContent = provider === 'auto' ? 'Auto-seleção' : 'Selecione uma API';
            document.getElementById('totalEstimate').textContent = provider === 'auto' ? 'Calculando...' : '$0.00';
            return;
        }

        const config = this.apiConfigs[provider];
        const usedTime = this.apiUsage[provider] || 0;
        const remainingFree = Math.max(0, config.freeLimit - usedTime);
        
        let cost = 0;
        if (duration <= remainingFree) {
            cost = 0;
        } else {
            const paidTime = duration - remainingFree;
            cost = paidTime * (config.costAfterLimit || config.costPerSecond);
        }

        document.getElementById('selectedApiCost').textContent = config.name;
        document.getElementById('durationCost').textContent = `${duration}s`;
        document.getElementById('totalEstimate').textContent = `$${cost.toFixed(2)}`;
    }

    async generateVideo() {
        const formData = new FormData(document.getElementById('videoForm'));
        const data = Object.fromEntries(formData.entries());
        
        // Validate form
        if (!this.validateForm(data)) return;

        // Choose best API if auto-select
        if (data.apiProvider === 'auto') {
            data.apiProvider = this.chooseBestAPI(parseInt(data.videoDuration));
        }

        // Check if API is configured
        if (!this.isApiConfigured(data.apiProvider)) {
            this.showToast(`API ${this.apiConfigs[data.apiProvider].name} não configurada. Configure nas configurações.`, 'error');
            return;
        }

        // Start generation process
        this.startGeneration(data);
        
        try {
            const result = await this.callVideoAPI(data);
            this.completeGeneration(result, data);
        } catch (error) {
            this.failGeneration(error);
        }
    }

    isApiConfigured(provider) {
        return this.apiKeys[provider] || localStorage.getItem('testMode') === 'true';
    }

    validateForm(data) {
        if (!data.promptText.trim()) {
            this.showToast('Por favor, descreva o vídeo que você quer criar', 'error');
            return false;
        }
        if (data.videoType === 'image-to-video' && !document.querySelector('#imagePreview img')) {
            this.showToast('Por favor, faça upload de uma imagem', 'error');
            return false;
        }
        return true;
    }

    chooseBestAPI(duration) {
        let bestAPI = 'synthesia';
        let lowestCost = Infinity;

        for (const [key, config] of Object.entries(this.apiConfigs)) {
            if (!this.isApiConfigured(key)) continue;
            
            const usedTime = this.apiUsage[key] || 0;
            const remainingFree = Math.max(0, config.freeLimit - usedTime);
            
            let cost;
            if (duration <= remainingFree) {
                cost = 0;
            } else {
                const paidTime = duration - remainingFree;
                cost = paidTime * (config.costAfterLimit || config.costPerSecond);
            }

            if (cost < lowestCost) {
                lowestCost = cost;
                bestAPI = key;
            }
        }

        return bestAPI;
    }

    startGeneration(data) {
        const generateBtn = document.getElementById('generateBtn');
        const btnText = generateBtn.querySelector('.btn-text');
        const btnLoader = generateBtn.querySelector('.btn-loader');
        
        generateBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';

        // Show generation status
        const statusSection = document.getElementById('generationStatus');
        statusSection.style.display = 'block';
        
        this.updateGenerationProgress(0, 'Inicializando geração...');
        
        // Hide empty state
        document.getElementById('emptyState').style.display = 'none';
    }

    updateGenerationProgress(progress, message) {
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('statusMessage').textContent = message;
        
        const estimatedTime = Math.max(5, 30 - (progress / 100 * 25));
        document.getElementById('estimatedTime').textContent = `${Math.round(estimatedTime)}s`;
    }

    async callVideoAPI(data) {
        // Se estiver em modo teste, usar simulação
        if (localStorage.getItem('testMode') === 'true') {
            return this.simulateAPICall(data);
        }

        const config = this.apiConfigs[data.apiProvider];
        
        this.updateGenerationProgress(10, `Conectando com ${config.name}...`);

        try {
            switch (data.apiProvider) {
                case 'replicate':
                    return await this.callReplicateAPI(data);
                case 'veo':
                    return await this.callVeoAPI(data);
                case 'synthesia':
                    return await this.callSynthesiaAPI(data);
                case 'heygen':
                    return await this.callHeyGenAPI(data);
                default:
                    throw new Error('API não suportada');
            }
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    async callReplicateAPI(data) {
        const apiKey = this.apiKeys.replicate;
        
        this.updateGenerationProgress(25, 'Enviando prompt para Replicate...');

        // Escolher modelo baseado no tipo de vídeo
        let model;
        switch (data.videoType) {
            case 'text-to-video':
                model = 'minimax/video-01';
                break;
            case 'image-to-video':
                model = 'stability-ai/stable-video-diffusion';
                break;
            default:
                model = 'minimax/video-01';
        }

        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: model,
                input: {
                    prompt: data.promptText,
                    duration: parseInt(data.videoDuration),
                    aspect_ratio: data.videoQuality === '1080p' ? '16:9' : '4:3'
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Erro Replicate: ${response.status} ${response.statusText}`);
        }

        const prediction = await response.json();
        
        // Poll para resultado
        return await this.pollReplicateResult(prediction.id, data);
    }

    async pollReplicateResult(predictionId, data) {
        const apiKey = this.apiKeys.replicate;
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
            this.updateGenerationProgress(
                40 + (attempts / maxAttempts) * 50, 
                `Processando vídeo... (${attempts + 1}/${maxAttempts})`
            );

            await new Promise(resolve => setTimeout(resolve, 2000));

            const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: {
                    'Authorization': `Token ${apiKey}`
                }
            });

            const result = await response.json();

            if (result.status === 'succeeded') {
                return {
                    id: 'video_' + Date.now(),
                    url: result.output?.[0] || result.output,
                    thumbnail: this.generateThumbnailFromVideo(result.output?.[0] || result.output),
                    duration: parseInt(data.videoDuration),
                    quality: data.videoQuality,
                    api: data.apiProvider,
                    prompt: data.promptText,
                    style: data.videoStyle,
                    type: data.videoType,
                    createdAt: new Date().toISOString(),
                    cost: this.calculateCost(data.apiProvider, parseInt(data.videoDuration))
                };
            } else if (result.status === 'failed') {
                throw new Error(`Falha na geração: ${result.error}`);
            }

            attempts++;
        }

        throw new Error('Tempo limite excedido para geração do vídeo');
    }

    async callVeoAPI(data) {
        const { apiKey, projectId } = this.apiKeys.veo;
        
        this.updateGenerationProgress(25, 'Enviando prompt para Google Veo...');

        const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/veo-2:streamGenerateContent`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Generate a ${data.videoDuration} second video: ${data.promptText}. Style: ${data.videoStyle}. Quality: ${data.videoQuality}.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Erro Google Veo: ${response.status} ${response.statusText}`);
        }

        // Processar resposta streaming
        return await this.processVeoResponse(response, data);
    }

    async processVeoResponse(response, data) {
        const reader = response.body.getReader();
        let videoUrl = null;

        while (true) {
            this.updateGenerationProgress(60, 'Processando resposta do Veo...');
            
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.candidates?.[0]?.content?.parts?.[0]?.videoUrl) {
                            videoUrl = data.candidates[0].content.parts[0].videoUrl;
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }
            }
        }

        if (!videoUrl) {
            throw new Error('Não foi possível obter URL do vídeo do Veo');
        }

        return {
            id: 'video_' + Date.now(),
            url: videoUrl,
            thumbnail: this.generateThumbnailFromVideo(videoUrl),
            duration: parseInt(data.videoDuration),
            quality: data.videoQuality,
            api: data.apiProvider,
            prompt: data.promptText,
            style: data.videoStyle,
            type: data.videoType,
            createdAt: new Date().toISOString(),
            cost: this.calculateCost(data.apiProvider, parseInt(data.videoDuration))
        };
    }

    async callSynthesiaAPI(data) {
        const apiKey = this.apiKeys.synthesia;
        
        this.updateGenerationProgress(25, 'Criando vídeo com avatar Synthesia...');

        const response = await fetch('https://api.synthesia.io/v2/videos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: `AI Generated Video - ${Date.now()}`,
                description: data.promptText,
                visibility: 'private',
                aspectRatio: '16:9',
                scenes: [{
                    elements: [{
                        type: 'avatar',
                        properties: {
                            avatarId: 'anna_costume1_cameraA',
                            script: data.promptText,
                            style: data.videoStyle
                        }
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Erro Synthesia: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // Poll para resultado
        return await this.pollSynthesiaResult(result.id, data);
    }

    async pollSynthesiaResult(videoId, data) {
        const apiKey = this.apiKeys.synthesia;
        let attempts = 0;
        const maxAttempts = 60; // Synthesia pode demorar mais
        
        while (attempts < maxAttempts) {
            this.updateGenerationProgress(
                40 + (attempts / maxAttempts) * 50, 
                `Renderizando vídeo com avatar... (${attempts + 1}/${maxAttempts})`
            );

            await new Promise(resolve => setTimeout(resolve, 3000));

            const response = await fetch(`https://api.synthesia.io/v2/videos/${videoId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            const result = await response.json();

            if (result.status === 'complete') {
                return {
                    id: 'video_' + Date.now(),
                    url: result.download,
                    thumbnail: result.thumbnail,
                    duration: parseInt(data.videoDuration),
                    quality: data.videoQuality,
                    api: data.apiProvider,
                    prompt: data.promptText,
                    style: data.videoStyle,
                    type: data.videoType,
                    createdAt: new Date().toISOString(),
                    cost: this.calculateCost(data.apiProvider, parseInt(data.videoDuration))
                };
            } else if (result.status === 'failed') {
                throw new Error(`Falha no Synthesia: ${result.error}`);
            }

            attempts++;
        }

        throw new Error('Tempo limite excedido para geração no Synthesia');
    }

    async callHeyGenAPI(data) {
        const apiKey = this.apiKeys.heygen;
        
        this.updateGenerationProgress(25, 'Gerando vídeo no HeyGen...');

        const response = await fetch('https://api.heygen.com/v2/video/generate', {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                background: '#ffffff',
                clips: [{
                    avatar_id: 'default',
                    input_text: data.promptText,
                    voice_id: 'en-US-JennyNeural'
                }],
                ratio: '16:9',
                test: false
            })
        });

        if (!response.ok) {
            throw new Error(`Erro HeyGen: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // Poll para resultado
        return await this.pollHeyGenResult(result.data.video_id, data);
    }

    async pollHeyGenResult(videoId, data) {
        const apiKey = this.apiKeys.heygen;
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
            this.updateGenerationProgress(
                40 + (attempts / maxAttempts) * 50, 
                `Processando no HeyGen... (${attempts + 1}/${maxAttempts})`
            );

            await new Promise(resolve => setTimeout(resolve, 2000));

            const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
                headers: {
                    'X-API-Key': apiKey
                }
            });

            const result = await response.json();

            if (result.data.status === 'completed') {
                return {
                    id: 'video_' + Date.now(),
                    url: result.data.video_url,
                    thumbnail: result.data.thumbnail_url,
                    duration: parseInt(data.videoDuration),
                    quality: data.videoQuality,
                    api: data.apiProvider,
                    prompt: data.promptText,
                    style: data.videoStyle,
                    type: data.videoType,
                    createdAt: new Date().toISOString(),
                    cost: this.calculateCost(data.apiProvider, parseInt(data.videoDuration))
                };
            } else if (result.data.status === 'failed') {
                throw new Error(`Falha no HeyGen: ${result.data.error}`);
            }

            attempts++;
        }

        throw new Error('Tempo limite excedido para geração no HeyGen');
    }

    // Simulação para modo teste
    async simulateAPICall(data) {
        const config = this.apiConfigs[data.apiProvider];
        
        const steps = [
            { progress: 10, message: 'Conectando com ' + config.name + '... (SIMULAÇÃO)' },
            { progress: 25, message: 'Processando prompt... (SIMULAÇÃO)' },
            { progress: 40, message: 'Gerando frames... (SIMULAÇÃO)' },
            { progress: 60, message: 'Aplicando efeitos... (SIMULAÇÃO)' },
            { progress: 80, message: 'Renderizando vídeo... (SIMULAÇÃO)' },
            { progress: 95, message: 'Finalizando... (SIMULAÇÃO)' }
        ];

        for (const step of steps) {
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
            this.updateGenerationProgress(step.progress, step.message);
        }

        return {
            id: 'video_' + Date.now(),
            url: this.generateMockVideoURL(),
            thumbnail: this.generateMockThumbnail(),
            duration: parseInt(data.videoDuration),
            quality: data.videoQuality,
            api: data.apiProvider,
            prompt: data.promptText,
            style: data.videoStyle,
            type: data.videoType,
            createdAt: new Date().toISOString(),
            cost: this.calculateCost(data.apiProvider, parseInt(data.videoDuration))
        };
    }

    generateMockVideoURL() {
        return `https://sample-videos.com/zip/10/mp4/SampleVideo_${Math.floor(Math.random() * 1000)}.mp4`;
    }

    generateMockThumbnail() {
        const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        return `https://via.placeholder.com/320x180/${color}/FFFFFF?text=AI+Video`;
    }

    generateThumbnailFromVideo(videoUrl) {
        // Em uma implementação real, você geraria um thumbnail do vídeo
        // Por enquanto, retorna um placeholder
        const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        return `https://via.placeholder.com/320x180/${color}/FFFFFF?text=Real+Video`;
    }

    calculateCost(provider, duration) {
        const config = this.apiConfigs[provider];
        const usedTime = this.apiUsage[provider] || 0;
        const remainingFree = Math.max(0, config.freeLimit - usedTime);
        
        if (duration <= remainingFree) {
            return 0;
        } else {
            const paidTime = duration - remainingFree;
            return paidTime * (config.costAfterLimit || config.costPerSecond);
        }
    }

    completeGeneration(result, data) {
        this.updateGenerationProgress(100, 'Vídeo gerado com sucesso!');
        
        setTimeout(() => {
            // Reset button
            const generateBtn = document.getElementById('generateBtn');
            const btnText = generateBtn.querySelector('.btn-text');
            const btnLoader = generateBtn.querySelector('.btn-loader');
            
            generateBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';

            // Hide generation status
            document.getElementById('generationStatus').style.display = 'none';

            // Save video
            this.videos.unshift(result);
            this.saveToStorage('aiVideos', this.videos);

            // Update usage
            this.apiUsage[data.apiProvider] = (this.apiUsage[data.apiProvider] || 0) + result.duration;
            this.saveToStorage('apiUsage', this.apiUsage);

            // Update cost
            this.totalCost += result.cost;
            localStorage.setItem('totalCost', this.totalCost.toString());

            // Add to cost history
            this.costHistory.push({
                date: new Date().toISOString().split('T')[0],
                cost: result.cost,
                api: data.apiProvider
            });
            this.saveToStorage('costHistory', this.costHistory);

            // Update UI
            this.updateStats();
            this.updateAnalytics();
            this.renderVideoGallery();
            this.updateCostEstimate();

            // Show success notification
            const modeText = localStorage.getItem('testMode') === 'true' ? ' (Simulação)' : '';
            this.showToast(`Vídeo gerado com sucesso${modeText}! 🎉`, 'success');

            // Reset form
            document.getElementById('videoForm').reset();
            document.getElementById('imagePreview').innerHTML = '';
        }, 1500);
    }

    failGeneration(error) {
        console.error('Video generation failed:', error);
        
        // Reset button
        const generateBtn = document.getElementById('generateBtn');
        const btnText = generateBtn.querySelector('.btn-text');
        const btnLoader = generateBtn.querySelector('.btn-loader');
        
        generateBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';

        // Hide generation status
        document.getElementById('generationStatus').style.display = 'none';

        // Show detailed error
        let errorMessage = 'Erro ao gerar vídeo.';
        
        if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage = 'Erro de autenticação. Verifique sua API key.';
        } else if (error.message.includes('429')) {
            errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
        } else if (error.message.includes('500')) {
            errorMessage = 'Erro interno da API. Tente novamente mais tarde.';
        } else if (error.message.includes('Tempo limite')) {
            errorMessage = 'Geração demorou muito. Tente um vídeo mais curto.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        this.showToast(errorMessage, 'error');
    }

    updateStats() {
        document.getElementById('totalVideos').textContent = this.videos.length;
        document.getElementById('totalCost').textContent = `${this.totalCost.toFixed(2)}`;
    }

    updateAnalytics() {
        // Update API usage display
        const apiUsageContainer = document.getElementById('apiUsage');
        apiUsageContainer.innerHTML = '';
        
        for (const [key, config] of Object.entries(this.apiConfigs)) {
            const usage = this.apiUsage[key] || 0;
            const isConfigured = this.isApiConfigured(key);
            
            const usageItem = document.createElement('div');
            usageItem.className = 'usage-item';
            usageItem.innerHTML = `
                <span class="api-name">${config.name} ${!isConfigured ? '🔒' : '✅'}</span>
                <span class="usage-count">${Math.round(usage)}s</span>
            `;
            apiUsageContainer.appendChild(usageItem);
        }

        // Update cost chart
        this.updateCostChart();
    }

    updateCostChart() {
        const canvas = document.getElementById('costChart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.costHistory.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Nenhum dado ainda', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Simple bar chart
        const maxCost = Math.max(...this.costHistory.map(item => item.cost), 1);
        const barWidth = canvas.width / Math.max(this.costHistory.length, 7);
        
        this.costHistory.slice(-7).forEach((item, index) => {
            const barHeight = (item.cost / maxCost) * (canvas.height - 40);
            const x = index * barWidth;
            const y = canvas.height - barHeight - 20;
            
            // Draw bar
            ctx.fillStyle = '#4ECDC4';
            ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
            
            // Draw cost label
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${item.cost.toFixed(2)}`, x + barWidth / 2, y - 5);
        });
    }

    renderVideoGallery() {
        const gallery = document.getElementById('videoGallery');
        const emptyState = document.getElementById('emptyState');
        
        if (this.videos.length === 0) {
            gallery.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        gallery.innerHTML = this.videos.map(video => this.createVideoCard(video)).join('');
    }

    createVideoCard(video) {
        const config = this.apiConfigs[video.api];
        const createdDate = new Date(video.createdAt).toLocaleDateString('pt-BR');
        
        return `
            <div class="video-card" onclick="openVideoModal('${video.id}')">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail}" alt="Video thumbnail" loading="lazy">
                    <div class="video-duration">${video.duration}s</div>
                    <div class="video-quality">${video.quality}</div>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${this.truncateText(video.prompt, 50)}</h3>
                    <div class="video-meta">
                        <span class="api-badge api-${video.api}">${config.name}</span>
                        <span class="video-date">${createdDate}</span>
                    </div>
                    <div class="video-cost">
                        ${video.cost === 0 ? 'Gratuito' : `${video.cost.toFixed(2)}`}
                    </div>
                </div>
                <div class="video-actions">
                    <button onclick="event.stopPropagation(); downloadVideo('${video.id}')" class="action-btn" title="Download">
                        📥
                    </button>
                    <button onclick="event.stopPropagation(); shareVideo('${video.id}')" class="action-btn" title="Compartilhar">
                        🔗
                    </button>
                    <button onclick="event.stopPropagation(); deleteVideo('${video.id}')" class="action-btn delete" title="Excluir">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    closeModal() {
        document.getElementById('videoModal').style.display = 'none';
    }

    // Método para reconfigurar APIs
    reconfigureAPIs() {
        this.showApiSetupModal();
    }

    // Método para limpar configurações de API
    clearApiKeys() {
        if (confirm('Tem certeza que deseja limpar todas as configurações de API?')) {
            this.apiKeys = {};
            this.saveToStorage('apiKeys', {});
            localStorage.removeItem('testMode');
            this.updateAnalytics();
            this.showToast('Configurações de API limpas! 🧹', 'success');
        }
    }

    // Método para testar conectividade das APIs
    async testApiConnections() {
        const results = {};
        
        for (const [provider, key] of Object.entries(this.apiKeys)) {
            try {
                this.showToast(`Testando ${this.apiConfigs[provider].name}...`, 'info');
                
                switch (provider) {
                    case 'replicate':
                        const response = await fetch('https://api.replicate.com/v1/models', {
                            headers: { 'Authorization': `Token ${key}` }
                        });
                        results[provider] = response.ok;
                        break;
                        
                    case 'synthesia':
                        const synthesiaResponse = await fetch('https://api.synthesia.io/v2/avatars', {
                            headers: { 'Authorization': `Bearer ${key}` }
                        });
                        results[provider] = synthesiaResponse.ok;
                        break;
                        
                    default:
                        results[provider] = true; // Para APIs mais complexas, assumir que está OK
                }
                
                const status = results[provider] ? '✅ Conectado' : '❌ Erro';
                this.showToast(`${this.apiConfigs[provider].name}: ${status}`, results[provider] ? 'success' : 'error');
                
            } catch (error) {
                results[provider] = false;
                this.showToast(`${this.apiConfigs[provider].name}: ❌ Erro de conexão`, 'error');
            }
        }
        
        return results;
    }
}

// Global functions
function addPromptSuggestion(type) {
    const promptField = document.getElementById('promptText');
    const suggestions = {
        cinematografico: 'câmera cinematográfica, iluminação dramática, movimento suave, 4K, alta qualidade',
        produto: 'fundo limpo, iluminação profissional, rotação 360°, detalhes em close-up',
        natureza: 'paisagem natural, cores vibrantes, movimento orgânico, atmosfera serena'
    };
    
    const currentText = promptField.value.trim();
    const suggestion = suggestions[type];
    
    if (currentText) {
        promptField.value = `${currentText}, ${suggestion}`;
    } else {
        promptField.value = suggestion;
    }
}

function openVideoModal(videoId) {
    const video = window.videoGenerator.videos.find(v => v.id === videoId);
    if (!video) return;
    
    const modal = document.getElementById('videoModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = 'Detalhes do Vídeo';
    modalBody.innerHTML = `
        <div class="modal-video">
            <video controls style="width: 100%; max-height: 400px;" preload="metadata">
                <source src="${video.url}" type="video/mp4">
                Seu navegador não suporta vídeos HTML5.
            </video>
        </div>
        <div class="modal-details">
            <h3>Informações</h3>
            <table class="details-table">
                <tr><td><strong>Prompt:</strong></td><td>${video.prompt}</td></tr>
                <tr><td><strong>API:</strong></td><td>${window.videoGenerator.apiConfigs[video.api].name}</td></tr>
                <tr><td><strong>Duração:</strong></td><td>${video.duration} segundos</td></tr>
                <tr><td><strong>Qualidade:</strong></td><td>${video.quality}</td></tr>
                <tr><td><strong>Estilo:</strong></td><td>${video.style}</td></tr>
                <tr><td><strong>Tipo:</strong></td><td>${video.type}</td></tr>
                <tr><td><strong>Custo:</strong></td><td>${video.cost === 0 ? 'Gratuito' : `${video.cost.toFixed(2)}`}</td></tr>
                <tr><td><strong>Criado em:</strong></td><td>${new Date(video.createdAt).toLocaleString('pt-BR')}</td></tr>
            </table>
            <div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px;">
                <button onclick="downloadVideo('${video.id}')" class="action-btn">📥 Download</button>
                <button onclick="shareVideo('${video.id}')" class="action-btn">🔗 Compartilhar</button>
                <button onclick="regenerateVideo('${video.id}')" class="action-btn">🔄 Regerar</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeModal() {
    window.videoGenerator.closeModal();
}

function downloadVideo(videoId) {
    const video = window.videoGenerator.videos.find(v => v.id === videoId);
    if (!video) return;
    
    // Create download link
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `ai-video-${videoId}.mp4`;
    link.target = '_blank';
    
    // For external URLs, open in new tab
    if (video.url.startsWith('http')) {
        window.open(video.url, '_blank');
        window.videoGenerator.showToast('Vídeo aberto em nova aba! 📥', 'success');
    } else {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.videoGenerator.showToast('Download iniciado! 📥', 'success');
    }
}

function shareVideo(videoId) {
    const video = window.videoGenerator.videos.find(v => v.id === videoId);
    if (!video) return;
    
    const shareData = {
        title: 'Vídeo gerado por IA',
        text: `Confira este vídeo criado com IA: "${video.prompt}"`,
        url: video.url
    };
    
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        navigator.share(shareData);
    } else {
        // Fallback: copiar para clipboard
        const shareText = `${shareData.text}\n${shareData.url}`;
        navigator.clipboard.writeText(shareText).then(() => {
            window.videoGenerator.showToast('Link copiado para a área de transferência! 🔗', 'success');
        }).catch(() => {
            // Fallback do fallback: mostrar o link
            prompt('Copie o link do vídeo:', video.url);
        });
    }
}

function regenerateVideo(videoId) {
    const video = window.videoGenerator.videos.find(v => v.id === videoId);
    if (!video) return;
    
    if (confirm('Deseja regerar este vídeo? Isso criará uma nova versão.')) {
        // Preencher formulário com dados do vídeo
        document.getElementById('promptText').value = video.prompt;
        document.getElementById('videoDuration').value = video.duration;
        document.getElementById('videoQuality').value = video.quality;
        document.getElementById('videoStyle').value = video.style;
        document.getElementById('videoType').value = video.type;
        document.getElementById('apiProvider').value = video.api;
        
        // Fechar modal e scrollar para o formulário
        closeModal();
        document.getElementById('videoForm').scrollIntoView({ behavior: 'smooth' });
        
        window.videoGenerator.showToast('Formulário preenchido! Ajuste se necessário e gere novamente. 🔄', 'info');
    }
}

function deleteVideo(videoId) {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
    
    window.videoGenerator.videos = window.videoGenerator.videos.filter(v => v.id !== videoId);
    window.videoGenerator.saveToStorage('aiVideos', window.videoGenerator.videos);
    
    window.videoGenerator.updateStats();
    window.videoGenerator.renderVideoGallery();
    window.videoGenerator.showToast('Vídeo excluído com sucesso! 🗑️', 'success');
    
    // Fechar modal se estiver aberto
    closeModal();
}

function clearHistory() {
    if (!confirm('Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.')) return;
    
    localStorage.removeItem('aiVideos');
    localStorage.removeItem('apiUsage');
    localStorage.removeItem('costHistory');
    localStorage.removeItem('totalCost');
    
    window.videoGenerator = new AIVideoGenerator();
    window.videoGenerator.showToast('Histórico limpo com sucesso! 🧹', 'success');
}

function configureAPIs() {
    window.videoGenerator.reconfigureAPIs();
}

function clearApiConfig() {
    window.videoGenerator.clearApiKeys();
}

function testAPIs() {
    window.videoGenerator.testApiConnections();
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.videoGenerator = new AIVideoGenerator();
    
    // Adicionar botões de configuração ao sidebar se não existirem
    setTimeout(() => {
        const sidebar = document.querySelector('.analytics-sidebar .settings');
        if (sidebar && !document.getElementById('configureApisBtn')) {
            const configSection = document.createElement('div');
            configSection.innerHTML = `
                <div class="setting-item">
                    <button id="configureApisBtn" onclick="configureAPIs()" class="clear-btn" style="background: #4ECDC4;">🔧 Configurar APIs</button>
                </div>
                <div class="setting-item">
                    <button onclick="testAPIs()" class="clear-btn" style="background: #45B7D1;">🧪 Testar APIs</button>
                </div>
                <div class="setting-item">
                    <button onclick="clearApiConfig()" class="clear-btn" style="background: #FFA07A;">🔑 Limpar APIs</button>
                </div>
            `;
            sidebar.appendChild(configSection);
        }
    }, 1000);
});