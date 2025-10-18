let displayValue = '0';
let firstOperand = null;
let operator = null;
let waitingForSecondOperand = false;

const display = document.getElementById('display');

function updateDisplay() {
    display.textContent = displayValue;
}

function clearDisplay() {
    displayValue = '0';
    firstOperand = null;
    operator = null;
    waitingForSecondOperand = false;
    updateDisplay();
}

function deleteChar() {
    if (displayValue.length > 1) {
        displayValue = displayValue.slice(0, -1);
    } else {
        displayValue = '0';
    }
    updateDisplay();
}

function appendNumber(num) {
    if (waitingForSecondOperand) {
        displayValue = String(num);
        waitingForSecondOperand = false;
    } else {
        if (displayValue === '0') {
            displayValue = String(num);
        } else {
            displayValue += String(num);
        }
    }
    updateDisplay();
}

function appendOperator(nextOperator) {
    const inputValue = parseFloat(displayValue);
    
    if (firstOperand === null && !isNaN(inputValue)) {
        firstOperand = inputValue;
    } else if (operator) {
        const result = performCalculation();
        displayValue = String(result);
        firstOperand = result;
    }
    
    waitingForSecondOperand = true;
    operator = nextOperator;
    updateDisplay();
}

function performCalculation() {
    const inputValue = parseFloat(displayValue);
    
    if (operator === '+') {
        return firstOperand + inputValue;
    } else if (operator === '-') {
        return firstOperand - inputValue;
    } else if (operator === '*') {
        return firstOperand * inputValue;
    } else if (operator === '/') {
        return firstOperand / inputValue;
    } else if (operator === '%') {
        return firstOperand % inputValue;
    }
    
    return inputValue;
}

function calculate() {
    if (operator && !waitingForSecondOperand) {
        const result = performCalculation();
        displayValue = String(result);
        firstOperand = result;
        operator = null;
        waitingForSecondOperand = false;
        updateDisplay();
    }
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered: ', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}
