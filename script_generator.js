
const SECRET_SALT = "SECURE-PIN-";

// Al cargar, poner la fecha de hoy automáticamente
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    document.getElementById('dateInput').value = `${dd}-${mm}-${yyyy}`;
});

async function getFullVector(dateObj, pin) {
    const epochDays = Math.floor(dateObj.getTime() / 86400000);
    const X = Math.abs(epochDays) % 4096; 

    const encoder = new TextEncoder();
    const data = encoder.encode(SECRET_SALT + pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);

    // Llaves deterministas
    const A1 = ((hashArray[0] << 8) | hashArray[1]) | 1; 
    const C1 = ((hashArray[2] << 8) | hashArray[3]);
    const K  = ((hashArray[4] << 8) | hashArray[5]) & 0xFFF;
    const A2 = ((hashArray[6] << 8) | hashArray[7]) | 1;
    const C2 = ((hashArray[8] << 8) | hashArray[9]);

    // Red de Permutación
    let s1 = (X * A1 + C1) % 4096;
    let s2 = s1 ^ K;
    let s3 = ((s2 << 6) & 0xFC0) | (s2 >> 6); // Swap nibbles
    let hashBits = (s3 * A2 + C2) % 4096;

    // Checksum
    const n1 = (hashBits >> 8) & 0xF;
    const n2 = (hashBits >> 4) & 0xF;
    const n3 = hashBits & 0xF;
    const checksum = n1 ^ n2 ^ n3;

    // Vector Final de 16 bits (Aseguramos unsigned de 16 bits)
    return ((hashBits << 4) | (checksum & 0xF)) >>> 0;
}

async function generateMatrix() {
    const dateInput = document.getElementById('dateInput');
    const pinInput = document.getElementById('pinInput');
    const dateStr = dateInput.value.trim();
    const pinVal = parseInt(pinInput.value) || 0;

    if (!/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        alert("Formato de fecha inválido (DD-MM-YYYY)");
        return;
    }

    const [d, m, y] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));

    // Obtener el vector usando la lógica unificada
    const finalVector = await getFullVector(dateObj, pinVal);
    
    renderMatrix(finalVector, `ID: ${finalVector.toString(16).toUpperCase().padStart(4, '0')}`);
}

function renderMatrix(vector, dateLabel) {
    const grid = document.getElementById('matrixGrid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 16; i++) {
        // Leemos del bit más significativo al menos significativo
        const bitValue = (vector >> (15 - i)) & 1;
        const isChecksum = i >= 12;
        
        const cell = document.createElement('div');
        cell.className = `cell ${bitValue ? 'active' : ''} ${isChecksum ? 'checksum' : ''}`;
        
        // Etiqueta interna para guía visual
        const label = isChecksum ? 'C' : 'H';
        cell.innerHTML = `<span>${label}${i}</span>`;
        
        grid.appendChild(cell);
    }
    
    document.getElementById('statusInfo').innerText = `Sello verificado: ${dateLabel}`;
}

async function analyzeSelloLongevity() {
    const dateInput = document.getElementById('dateInput');
    const pinInput = document.getElementById('pinInput');
    const resultDiv = document.getElementById('longevityResult');
    
    const startStr = dateInput.value.trim();
    const pinVal = parseInt(pinInput.value) || 0;
    
    if (!/^\d{2}-\d{2}-\d{4}$/.test(startStr)) {
        alert("Seleccione una fecha válida primero");
        return;
    }

    // 1. Obtener el vector del sello ACTUAL (el patrón objetivo)
    const [d, m, y] = startStr.split('-').map(Number);
    let startDate = new Date(Date.UTC(y, m - 1, d));
    const targetVector = await getFullVector(startDate, pinVal);
    
    resultDiv.innerHTML = "<em>Escaneando 10 años en el futuro...</em>";
    
    let matchCount = 0;
    let matchDates = [];
    const tenYearsInDays = 3653; // 10 años aprox.

    // 2. Bucle de barrido por 10 años
    let searchDate = new Date(startDate);
    
    for (let i = 1; i <= tenYearsInDays; i++) {
        searchDate.setUTCDate(searchDate.getUTCDate() + 1);
        
        const currentVector = await getFullVector(searchDate, pinVal);
        
        if (currentVector === targetVector) {
            matchCount++;
            // Guardamos la fecha de la colisión para mostrarla
            const dateStr = searchDate.getUTCDate().toString().padStart(2,'0') + "-" + 
                           (searchDate.getUTCMonth()+1).toString().padStart(2,'0') + "-" + 
                           searchDate.getUTCFullYear();
            matchDates.push(dateStr);
        }
    }

    // 3. Mostrar reporte detallado
    if (matchCount === 0) {
        resultDiv.className = "status-alt success";
        resultDiv.innerHTML = `<strong>Análisis de 10 años:</strong><br>¡Increíble! Este patrón es 100% único en la próxima década.`;
    } else {
        resultDiv.className = "status-alt warning";
        resultDiv.innerHTML = `
            <strong>Análisis de 10 años:</strong><br>
            Se encontraron <strong>${matchCount}</strong> repeticiones.<br>
            <small>Fechas de colisión: ${matchDates.join(', ')}</small>
        `;
    }
}

async function analyzeFullDecadeCollisions() {
    const pinInput = document.getElementById('pinInput');
    const resultDiv = document.getElementById('fullAuditResult');
    const pinVal = parseInt(pinInput.value) || 0;
    
    resultDiv.innerHTML = "<em>Iniciando auditoría masiva... Esto puede tardar unos segundos.</em>";
    
    const totalDays = 3653; // 10 años
    const startDate = new Date(Date.UTC(2026, 0, 1)); // Fecha base fija para la auditoría
    
    // Diccionario para agrupar fechas por su patrón de sello
    // Clave: Vector (0-65535), Valor: Array de fechas
    const collisionMap = new Map();

    // 1. Fase de Mapeo: Generamos todos los sellos de la década una sola vez
    for (let i = 0; i < totalDays; i++) {
        let currentDate = new Date(startDate);
        currentDate.setUTCDate(startDate.getUTCDate() + i);
        
        const vector = await getFullVector(currentDate, pinVal);
        const dateStr = currentDate.getUTCDate().toString().padStart(2,'0') + "-" + 
                       (currentDate.getUTCMonth()+1).toString().padStart(2,'0') + "-" + 
                       currentDate.getUTCFullYear();

        if (!collisionMap.has(vector)) {
            collisionMap.set(vector, []);
        }
        collisionMap.get(vector).push(dateStr);
    }

    // 2. Fase de Análisis: Identificar cuáles se repitieron
    let totalCollisions = 0;
    let detailsHTML = "<strong>Reporte de Colisiones (10 vs 10 años):</strong><br>";
    
    collisionMap.forEach((dates, vector) => {
        if (dates.length > 2) {
            totalCollisions++;
            detailsHTML += `<div style="margin-bottom:5px; border-bottom:1px solid #eee;">
                <strong>Patrón Hex: ${vector.toString(16).toUpperCase().padStart(4,'0')}</strong> se repite en:<br>
                <small>${dates.join(' | ')}</small>
            </div>`;
        }
    });

    // 3. Resultado Final
    if (totalCollisions === 0) {
        resultDiv.innerHTML = "✅ Increíble: Cero colisiones detectadas en toda la década para este PIN.";
    } else {
        resultDiv.innerHTML = `
            <div class="status-alt warning">
                Se encontraron <strong>${totalCollisions}</strong> patrones que colisionan entre sí dentro de la misma década.<br>
                <em>Un total de ${totalDays} días analizados.</em>
            </div>
            <div style="max-height: 300px; overflow-y: auto; text-align: left; padding: 10px; background: #fff; border: 1px solid #ccc;">
                ${detailsHTML}
            </div>
        `;
    }
}

async function analyzeFrequencyDistribution() {
    const pinInput = document.getElementById('pinInput');
    const resultDiv = document.getElementById('frequencyResult');
    const pinVal = parseInt(pinInput.value) || 0;
    
    resultDiv.innerHTML = "<em>Calculando densidades estadísticas...</em>";
    
    const totalDays = 3653; // 10 años
    const startDate = new Date(Date.UTC(2026, 0, 1));
    const patternMap = new Map();

    // 1. Mapeo de toda la década
    for (let i = 0; i < totalDays; i++) {
        let currentDate = new Date(startDate);
        currentDate.setUTCDate(startDate.getUTCDate() + i);
        
        const vector = await getFullVector(currentDate, pinVal);
        patternMap.set(vector, (patternMap.get(vector) || 0) + 1);
    }

    // 2. Agrupación por frecuencia
    // Estructura: { "1 repetición": X diseños, "2 repeticiones": Y diseños... }
    const frequencyCounts = {};
    patternMap.forEach((count) => {
        frequencyCounts[count] = (frequencyCounts[count] || 0) + 1;
    });

    // 3. Renderizado de Tabla de Resultados
    let tableHTML = `
        <table style="width:100%; border-collapse: collapse; margin-top:10px; background: white; color: #333;">
            <thead>
                <tr style="background: #f3f4f6;">
                    <th style="padding: 8px; border: 1px solid #ccc;">Repeticiones en 10 años</th>
                    <th style="padding: 8px; border: 1px solid #ccc;">Cantidad de Diseños</th>
                    <th style="padding: 8px; border: 1px solid #ccc;">Estado</th>
                </tr>
            </thead>
            <tbody>`;

    Object.keys(frequencyCounts).sort((a, b) => a - b).forEach(f => {
        const isUnique = f === "1";
        tableHTML += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${f} vez/veces</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${frequencyCounts[f]}</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">
                    ${isUnique ? '✅ Único' : '⚠️ Colisión'}
                </td>
            </tr>`;
    });

    tableHTML += `</tbody></table>`;

    // 4. Resumen Ejecutivo
    const uniquePercentage = ((frequencyCounts[1] || 0) / patternMap.size * 100).toFixed(1);
    
    resultDiv.innerHTML = `
        <div style="text-align: left; padding: 10px;">
            <strong>Resumen de Salud del PIN:</strong><br>
            • Diseños distintos generados: <strong>${patternMap.size}</strong><br>
            • Índice de exclusividad: <strong>${uniquePercentage}%</strong>
            ${tableHTML}
        </div>
    `;
}
