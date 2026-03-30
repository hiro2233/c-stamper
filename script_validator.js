
const SECRET_SALT = "SECURE-PIN-";

// Inicialización visual de la matriz interactiva
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('matrixGrid');
    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('div');
        const isChecksum = i >= 12;
        cell.className = `cell ${isChecksum ? 'checksum' : ''}`;
        cell.dataset.index = i;
        cell.innerHTML = `<span>${isChecksum ? 'CHK' : 'H'}</span><strong>${i}</strong>`;
        cell.onclick = () => cell.classList.toggle('selected');
        grid.appendChild(cell);
    }
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

async function verifyMatrix() {
    const startStr = document.getElementById('startDate').value;
    const endStr = document.getElementById('endDate').value;
    const pinVal = parseInt(document.getElementById('pinInput').value) || 0;

    // 1. Capturar matriz del usuario
    const cells = document.querySelectorAll('.cell');
    let userInputVector = 0;
    
    // IMPORTANTE: El bit 15 es la celda 0, el bit 0 es la celda 15
    for (let i = 0; i < 16; i++) {
        if (cells[i].classList.contains('selected')) {
            userInputVector |= (1 << (15 - i));
        }
    }
    userInputVector = userInputVector >>> 0; // Forzar a Unsigned

    let currentDate = parseDate(startStr);
    const stopDate = parseDate(endStr);
    let found = null;

    while (currentDate <= stopDate) {
        // Llamamos a la función unificada
        const referenceVector = await getFullVector(currentDate, pinVal);

        if (userInputVector === referenceVector) {
            found = { 
                date: dateToSTR(currentDate), 
                hex: referenceVector.toString(16).toUpperCase() 
            };
            break;
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    displayResult(found);
}

/**
 * Convierte un string DD-MM-YYYY en un objeto Date UTC
 * Evita desfases por zona horaria local.
 */
function parseDate(s) {
    const [d, m, y] = s.split('-').map(Number);
    // Usamos Date.UTC para que el cálculo de Epoch sea exacto a medianoche
    return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Convierte un objeto Date en string DD-MM-YYYY
 * Útil para mostrar la fecha encontrada en el resultado.
 */
function dateToSTR(date) {
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = date.getUTCFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

/**
 * Gestiona la visualización del resultado en el DOM
 */
function displayResult(found) {
    const resultDiv = document.getElementById('resultInfo');
    resultDiv.style.display = "block";

    if (found) {
        resultDiv.className = "result success";
        resultDiv.innerHTML = `
            <strong>✓ AUTÉNTICO</strong>
            <small>Semilla Hex: ${found.hex}</small>
            <span>Fecha: ${found.date}</span>
        `;
    } else {
        resultDiv.className = "result error";
        resultDiv.innerText = "✗ NO VÁLIDO\nNo se encontró coincidencia en el rango y PIN especificados.";
    }
}

