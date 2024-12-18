// Parâmetros de configurações para testes automatizados
const CROSSOVER_RATES = [0.6, 0.8];
const MUTATION_RATES = [0.05, 0.1];
const SELECTION_METHODS = ["Roleta", "Torneio"];
const CROSSOVER_METHODS = ["Cíclico", "PMX"];
const REINSERTION_METHODS = ["Ordenada", "Elitismo"];
const EXECUTIONS = 1000;
const PROBLEM = { word1: "SEND", word2: "MORE", result: "MONEY" };

// Botões de eventos
document.getElementById('runFixedConfig').addEventListener('click', () => {
    console.log("Executando SEND + MORE = MONEY...");
    runSingleExecution("SEND", "MORE", "MONEY", 100, 50, 0.8, 0.1);
});

document.getElementById('runManualConfig').addEventListener('click', () => {
    const problem = document.getElementById('problemSelect').value.split(/[+=]/);
    const populationSize = parseInt(document.getElementById('populationSize').value);
    const maxGenerations = parseInt(document.getElementById('maxGenerations').value);
    const crossoverRate = parseFloat(document.getElementById('crossoverRate').value);
    const mutationRate = parseFloat(document.getElementById('mutationRate').value);

    console.log(`Executando manualmente: ${problem[0]} + ${problem[1]} = ${problem[2]}`);
    runSingleExecution(problem[0], problem[1], problem[2], populationSize, maxGenerations, crossoverRate, mutationRate);
});

document.getElementById('runAllTests').addEventListener('click', () => {
    document.getElementById('testStatus').innerText = "Status: Executando testes... Isso pode demorar.";
    console.log("Executando todas as 24 combinações...");
    runAllConfigurations();
});

// Gera todas as 24 combinações possíveis de configurações
function generateConfigurations() {
    const configs = [];
    for (const crossoverRate of CROSSOVER_RATES)
        for (const mutationRate of MUTATION_RATES)
            for (const selectionMethod of SELECTION_METHODS)
                for (const crossoverMethod of CROSSOVER_METHODS)
                    for (const reinsertionMethod of REINSERTION_METHODS)
                        configs.push({ crossoverRate, mutationRate, selectionMethod, crossoverMethod, reinsertionMethod });
    return configs;
}

// Execução simples para uma única configuração
function runSingleExecution(word1, word2, result, populationSize, maxGenerations, crossoverRate, mutationRate) {
    let population = createPopulation(populationSize); //números de 0 a 9 embaralhados
    let bestFitness = Infinity;
    let bestIndividual = null;

    for (let generation = 1; generation <= maxGenerations; generation++) {
        const fitnesses = population.map(ind => calculateFitness(ind, word1, word2, result)); //Para cada geração, o fitness é calculado.
        const minFitness = Math.min(...fitnesses);

        if (minFitness < bestFitness) {
            bestFitness = minFitness;
            bestIndividual = population[fitnesses.indexOf(minFitness)];
            displayResult(generation, bestIndividual, bestFitness, word1, word2, result);
        }

        if (bestFitness === 0) {
            console.log(`Solução encontrada na geração ${generation}!`);
            return;
        }

    //Seleção: Escolhe indivíduos por torneio /Cruzamento: Combina genes dos pais /Mutação: Modifica genes aleatoriamente.
        population = evolvePopulation(population, fitnesses, crossoverRate, mutationRate);
    }

    console.log("Nenhuma solução exata encontrada após o limite de gerações.");
    displayResult(maxGenerations, bestIndividual, bestFitness, word1, word2, result);
}

// Teste completo das 24 combinações (1000 execuções cada)
function runAllConfigurations() {
    const results = [];
    const allExecutions = [];
    const configurations = generateConfigurations();

    configurations.forEach((config, index) => {
        let successCount = 0;
        let totalTime = 0;

        for (let i = 0; i < EXECUTIONS; i++) {
            const startTime = performance.now();
            const result = runGeneticAlgorithm(PROBLEM.word1, PROBLEM.word2, PROBLEM.result, 100, 50, config.crossoverRate, config.mutationRate);
            const endTime = performance.now();

            totalTime += (endTime - startTime);
            if (result.success) successCount++;

            allExecutions.push({
                ...config,
                execution: i + 1,
                success: result.success ? 1 : 0,
                time: (endTime - startTime).toFixed(2)
            });
        }

        results.push({
            ...config,
            successRate: (successCount / EXECUTIONS * 100).toFixed(2),
            averageTime: (totalTime / EXECUTIONS).toFixed(2)
        });
    });

    exportResultsToCSV(allExecutions);
    displayBestResults(results);
    document.getElementById('testStatus').innerText = "Status: Testes concluídos!";
}


// Gera a população inicial
function createPopulation(populationSize) {
    return Array.from({ length: populationSize }, () => shuffleArray([...Array(10).keys()]));
}

// Embaralha os genes para criar indivíduos
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Calcula o Fitness
function calculateFitness(individual, word1, word2, result) {
    // Verifica se os dígitos no indivíduo são únicos
    if (new Set(individual).size !== individual.length) return Infinity;

    const letterMap = mapLettersToDigits(word1, word2, result, individual);
    if (!letterMap) return Infinity;

    const num1 = getWordValue(word1, letterMap);
    const num2 = getWordValue(word2, letterMap);
    const numResult = getWordValue(result, letterMap);

    if (num1 === null || num2 === null || numResult === null) return Infinity;
    return Math.abs((num1 + num2) - numResult);
}


// Mapeia letras para dígitos
function mapLettersToDigits(word1, word2, result, individual) {
    const uniqueLetters = [...new Set(word1 + word2 + result)];
    if (uniqueLetters.length > 10) return null;

    const letterMap = {};
    uniqueLetters.forEach((letter, index) => {
        letterMap[letter] = individual[index];
    });
    return letterMap;
}

// Converte palavras em números
function getWordValue(word, letterMap) {
    if (letterMap[word[0]] === 0) return null; // Evita zeros à esquerda
    return parseInt(word.split('').map(letter => letterMap[letter]).join(''), 10);
}

// Evolui a população (Crossover e Mutação)
function evolvePopulation(population, fitnesses, crossoverRate, mutationRate) {
    const newPopulation = [];
    const sorted = population.map((ind, i) => ({ ind, fit: fitnesses[i] })).sort((a, b) => a.fit - b.fit);
    newPopulation.push(...sorted.slice(0, Math.floor(population.length * 0.2)).map(el => el.ind));

    while (newPopulation.length < population.length) {
        const parent1 = tournamentSelection(population, fitnesses);
        const parent2 = tournamentSelection(population, fitnesses);

        let child = Math.random() < crossoverRate ? crossover(parent1, parent2) : [...parent1];
        if (Math.random() < mutationRate) mutate(child);

        newPopulation.push(child);
    }
    return newPopulation;
}

// Seleção por torneio
function tournamentSelection(population, fitnesses) {
    const candidates = [];
    for (let i = 0; i < 3; i++) {
        const index = Math.floor(Math.random() * population.length);
        candidates.push({ ind: population[index], fit: fitnesses[index] });
    }
    return candidates.sort((a, b) => a.fit - b.fit)[0].ind;
}

// Crossover
function crossover(parent1, parent2) {
    const child = new Array(10).fill(null);
    parent1.forEach((gene, i) => { child[i] = i % 2 === 0 ? gene : parent2[i]; });
    return child;
}

// Mutação
function mutate(individual) {
    const [i, j] = [Math.floor(Math.random() * 10), Math.floor(Math.random() * 10)];
    [individual[i], individual[j]] = [individual[j], individual[i]];
}

// Exporta os resultados para CSV
function exportResultsToCSV(data) {
    const csvContent = "Crossover Rate,Mutation Rate,Selection Method,Crossover Method,Reinsertion Method,Execution,Success,Time\n"
        + data.map(d => `${d.crossoverRate},${d.mutationRate},${d.selectionMethod},${d.crossoverMethod},${d.reinsertionMethod},${d.execution},${d.success},${d.time}`).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "results.csv";
    link.click();
}

// Exibe os melhores resultados no frontend
function displayBestResults(results) {
    const bestResults = results.sort((a, b) => b.successRate - a.successRate).slice(0, 4);
    const container = document.getElementById('bestResults');
    container.innerHTML = bestResults.map((r, i) => `
        <p><strong>Combinação ${i + 1}:</strong> Crossover: ${r.crossoverRate}, Mutação: ${r.mutationRate}, 
        Seleção: ${r.selectionMethod}, Crossover Método: ${r.crossoverMethod}, Reinserção: ${r.reinsertionMethod}, 
        Sucesso: ${r.successRate}%, Tempo médio: ${r.averageTime} ms</p>
    `).join('');
}

function runGeneticAlgorithm(word1, word2, result, populationSize, maxGenerations, crossoverRate, mutationRate) {
    let population = createPopulation(populationSize);
    let bestFitness = Infinity;
    let bestIndividual = null;

    for (let generation = 1; generation <= maxGenerations; generation++) {
        const fitnesses = population.map(ind => calculateFitness(ind, word1, word2, result));
        const minFitness = Math.min(...fitnesses);

        if (minFitness < bestFitness) {
            bestFitness = minFitness;
            bestIndividual = population[fitnesses.indexOf(minFitness)];
        }

        if (bestFitness === 0) {
            return { success: true, generations: generation, individual: bestIndividual };
        }

        population = evolvePopulation(population, fitnesses, crossoverRate, mutationRate);
    }

    return { success: false, generations: maxGenerations, individual: bestIndividual, fitness: bestFitness };
}

// Função para exibir resultados no frontend
function displayResult(generation, individual, fitness, word1, word2, result) {
    const letterMap = mapLettersToDigits(word1, word2, result, individual);
    const letterValues = Object.entries(letterMap || {}).map(([letter, value]) => `${letter}=${value}`).join(", ");
    document.getElementById("generationOutput").textContent = generation;
    document.getElementById("lettersOutput").textContent = letterValues;
    document.getElementById("fitnessOutput").textContent = fitness;
}
