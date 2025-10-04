// rightview.js

// === Global Dependency Injection (index.html에서 정의됨) ===
// 'db'와 'questionsRef'는 index.html 스크립트에서 전역 변수로 정의되어야 합니다.
// 'appendLog'는 log.js에서 window 객체에 추가되어야 합니다.

const rightPane = document.getElementById('rightPane');
const questionFileInput = document.getElementById('questionFileInput');
const uploadQuestionBtn = document.getElementById('uploadQuestionBtn');

// window.correctAnswers는 index.html에서 전역으로 초기화되어야 합니다.
window.correctAnswers = {}; 

// --- 툴팁 함수 (복사 메시지) ---

function showCopyMessage(event) {
    const message = document.createElement('div');
    message.className = 'tooltip-copy-message';
    message.textContent = '클립보드에 복사됨';
    document.body.appendChild(message);
    
    const x = event.clientX + 10;
    const y = event.clientY - 30;

    message.style.left = `${x}px`;
    message.style.top = `${y}px`;

    setTimeout(() => {
        message.classList.add('fade-out');
        setTimeout(() => {
            message.remove();
        }, 400); 
    }, 800);
}

function fallbackCopy(text, event) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; 
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        document.execCommand('copy');
        showCopyMessage(event);
    } catch (err) {
        window.appendLog('클립보드 복사 실패. 브라우저 설정을 확인하세요.', 'error');
    }
    document.body.removeChild(textarea);
}

/**
 * 질문 텍스트를 클립보드에 복사합니다. (전역 노출)
 */
window.copyQuestion = function(text, event) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showCopyMessage(event);
        }).catch(() => {
            fallbackCopy(text, event);
        });
    } else {
        fallbackCopy(text, event);
    }
};

/**
 * 질문의 정답을 확인하고 UI를 업데이트합니다. (전역 노출)
 */
window.checkAnswer = function(radioButton) {
    const questionName = radioButton.name;
    const selectedValue = radioButton.value;
    
    const selectedAnswerBoolean = selectedValue === "O";
    const correctAnswerBoolean = window.correctAnswers[questionName];
    const isCorrect = selectedAnswerBoolean === correctAnswerBoolean;
    
    document.querySelectorAll(`input[name="${questionName}"]`).forEach(input => {
        const span = input.nextElementSibling;
        if (span) {
            span.classList.remove('text-green-600', 'text-orange-600');
            span.textContent = input.value;
        }
    });

    const selectedSpan = radioButton.nextElementSibling;
    if (selectedSpan) {
        selectedSpan.textContent = isCorrect ? `${selectedValue} 정답` : `${selectedValue} 오답`;
        selectedSpan.classList.add(isCorrect ? 'text-green-600' : 'text-orange-600');
        if (!isCorrect) {
            window.appendLog(`질문 ${questionName}에 오답을 선택했습니다.`, 'warning');
        }
    }
};

/**
 * 메모 내용을 Firestore에 저장합니다. (전역 노출)
 */
window.saveMemo = async function(questionId, memo) {
    // window.db와 window.doc, window.updateDoc은 index.html에서 정의됨
    const { db, doc, updateDoc } = window;
    
    const memoElement = document.querySelector(`.info-text[data-id="${questionId}"]`);
    if (memo.trim() === memoElement.dataset.originalMemo) {
        return;
    }

    try {
        const docRef = doc(db, "questions", questionId);
        await updateDoc(docRef, { memo: memo.trim() });
        memoElement.dataset.originalMemo = memo.trim();
        window.appendLog(`메모가 성공적으로 저장되었습니다. (ID: ${questionId})`, 'status');
    } catch (error) {
        window.appendLog(`메모 저장 중 오류 발생 (${questionId}): ${error.message}`, 'error');
    }
};

/**
 * 선택된 카테고리에 대한 질문 목록을 렌더링합니다. (전역 노출)
 */
window.renderQuestionsForCategory = async function(categoryId, categoryName) {
    // window.questionsRef, window.query, window.where, window.getDocs는 index.html에서 정의됨
    const { questionsRef, query, where, getDocs } = window;
    
    rightPane.innerHTML = `<div class="text-center text-gray-500 p-4">문제를 불러오는 중...</div>`;

    try {
        const q = query(questionsRef, where("category_document_id", "==", categoryId));
        const querySnapshot = await getDocs(q);

        rightPane.innerHTML = '';
        const pageContainer = document.createElement('div');
        pageContainer.className = 'page-container';
        const titleContainer = document.createElement('div');
        titleContainer.className = 'title-container';
        const titleElement = document.createElement('h1');
        titleElement.textContent = categoryName;
        titleContainer.appendChild(titleElement);
        pageContainer.appendChild(titleContainer);
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-container';
        pageContainer.appendChild(gridContainer);
        rightPane.appendChild(pageContainer);
        
        if (querySnapshot.empty) {
            gridContainer.innerHTML = `<div class="col-span-2 text-center p-4">해당 카테고리에 등록된 문제가 없습니다.</div>`;
            return;
        }
    
        const questions = [];
        querySnapshot.forEach(doc => questions.push({ id: doc.id, ...doc.data() }));
        questions.sort((a, b) => String(a.question_id || '').localeCompare(String(b.question_id || ''), 'ko'));
        
        const maxDigits = String(questions.length).length;
        let idx = 1;
        window.correctAnswers = {};
        
        questions.forEach((question, questionIndex) => {
            let isCorrectBoolean;
            if (typeof question.correct_answer === 'boolean') {
                isCorrectBoolean = question.correct_answer;
            } else if (typeof question.correct_answer === 'string') {
                const correctValue = question.correct_answer.toLowerCase();
                isCorrectBoolean = (correctValue === 'true' || correctValue === 'o' || correctValue === '1');
            } else if (typeof question.correct_answer === 'number') {
                isCorrectBoolean = (question.correct_answer === 1);
            } else {
                isCorrectBoolean = false;
            }
            
            window.correctAnswers[`q${idx}`] = isCorrectBoolean;
            
            const questionIdDefault = String(idx).padStart(maxDigits, '0');

            const cell1 = document.createElement('div');
            cell1.className = 'grid-cell bold-text';
            const displayQuestionId = question.question_id !== undefined && question.question_id !== null 
                ? question.question_id 
                : questionIdDefault;
            cell1.textContent = `${displayQuestionId}.`;
            
            cell1.addEventListener('click', (event) => window.copyQuestion(question.question_text, event));
            
            const cell2 = document.createElement('div');
            cell2.className = 'grid-cell bold-text';
            cell2.textContent = question.question_text;
            cell2.dataset.questionIndex = questionIndex;
            cell2.addEventListener('click', () => {
                const infoRowCells = document.querySelectorAll(`.info-row[data-question-index="${questionIndex}"]`);
                infoRowCells.forEach(cell => cell.classList.toggle('hidden'));
            });
            gridContainer.append(cell1, cell2);

            const cell3 = document.createElement('div');
            cell3.className = 'grid-cell';
            const cell4 = document.createElement('div');
            cell4.className = 'grid-cell';
            const answerOptionsHTML = `
                <div class="answer-options flex flex-col">
                    <label><input type="radio" name="q${idx}" value="O" class="mr-1" onchange="window.checkAnswer(this)"><span class="option-value">O</span></label>
                    <label><input type="radio" name="q${idx}" value="X" class="mr-1" onchange="window.checkAnswer(this)"><span class="option-value">X</span></label>
                </div>`;
            cell4.innerHTML = answerOptionsHTML;
            gridContainer.append(cell3, cell4);

            const hintCell1 = document.createElement('div');
            hintCell1.className = 'grid-cell info-row hidden';
            hintCell1.dataset.questionIndex = questionIndex;
            hintCell1.textContent = '';
            const hintCell2 = document.createElement('div');
            hintCell2.className = 'grid-cell info-row hidden';
            hintCell2.dataset.questionIndex = questionIndex;
            hintCell2.textContent = question.hint || '';
            gridContainer.append(hintCell1, hintCell2);

            const explainCell1 = document.createElement('div');
            explainCell1.className = 'grid-cell info-row hidden';
            explainCell1.dataset.questionIndex = questionIndex;
            explainCell1.textContent = '';
            const explainCell2 = document.createElement('div');
            explainCell2.className = 'grid-cell info-row hidden';
            explainCell2.dataset.questionIndex = questionIndex;
            explainCell2.textContent = question.explanation || '';
            gridContainer.append(explainCell1, explainCell2);

            const memoCell1 = document.createElement('div');
            memoCell1.className = 'grid-cell info-row hidden';
            memoCell1.dataset.questionIndex = questionIndex;
            memoCell1.textContent = '';
            const memoCell2 = document.createElement('div');
            memoCell2.className = 'grid-cell info-row hidden';
            memoCell2.dataset.questionIndex = questionIndex;
            const memoText = question.memo || '';
            const memoHTML = `<span class="info-text w-full inline-block" contenteditable="true" data-original-memo="${memoText}" data-id="${question.id}">${memoText}</span>`;
            memoCell2.innerHTML = memoHTML;
            gridContainer.append(memoCell1, memoCell2);
            
            if (questionIndex < questions.length - 1) {
                const separatorCell1 = document.createElement('div');
                separatorCell1.className = 'grid-separator-cell';
                const separatorCell2 = document.createElement('div');
                separatorCell2.className = 'grid-separator-cell';
                gridContainer.append(separatorCell1, separatorCell2);
            }

            idx++;
        });

        document.querySelectorAll('.info-text[contenteditable="true"]').forEach(memoElement => {
            let saveTimeout;
            memoElement.addEventListener('input', () => {
                const questionId = memoElement.dataset.id;
                clearTimeout(saveTimeout);
                // window.saveMemo는 여기서 정의됨
                saveTimeout = setTimeout(() => window.saveMemo(questionId, memoElement.textContent), 1500);
            });
        });

    } catch (error) {
        rightPane.innerHTML = `<div class="text-center text-red-500 p-4">문제 로딩 중 오류가 발생했습니다: ${error.message}</div>`;
        window.appendLog(`문제 로딩 중 오류가 발생했습니다: ${error.message}`, 'error');
    }
}

// --- 이벤트 리스너 (문제 업로드) ---

uploadQuestionBtn.addEventListener('click', () => {
    questionFileInput.click();
});

questionFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    // hideError()는 leftview.js에서 정의되었지만, 전역에 노출되지 않아 여기서는 직접 호출 불가. (index.html에서 초기화 시 호출됨을 가정)

    uploadQuestionBtn.disabled = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            // Firestore 및 XLSX 관련 전역 객체/함수 사용
            const { db, categoriesRef, questionsRef, writeBatch, getDocs, query, where, addDoc, XLSX } = window;
            
            let rows;
            const isCSV = file.name.endsWith('.csv');
            
            if (isCSV) {
                const workbook = XLSX.read(e.target.result, { type: 'string' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                rows = XLSX.utils.sheet_to_json(worksheet);
            } else {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                rows = XLSX.utils.sheet_to_json(worksheet);
            }
            
            const dataRows = rows; 

            const categoryCache = new Map();
            const batch = writeBatch(db); 
            const uploadedQuestionIds = new Set(); 
            let questionCount = 0;

            for (const row of dataRows) {
                
                const question_id = row['고유번호']; 
                const question_text = row['질문'];
                const correct_answer = row['정답'];
                const category = row['카테고리'];
                const hint = row['힌트'];
                const explanation = row['해설'];
                
                const normalized_q_id = question_id !== undefined && question_id !== null ? String(question_id).trim() : null;

                if (!question_text || !category) {
                    continue;
                }
                
                if (!normalized_q_id || normalized_q_id === "") {
                    throw new Error(`문제 업로드 실패: '고유번호' 필드가 비어있거나 누락된 행이 있습니다. (행 데이터: ${JSON.stringify(row)})`);
                }
                
                if (uploadedQuestionIds.has(normalized_q_id)) {
                    throw new Error(`문제 업로드 실패: 고유번호 '${normalized_q_id}'가 중복되었습니다. 전체 업로드를 무효화합니다.`);
                }
                uploadedQuestionIds.add(normalized_q_id);
                
                const q = query(questionsRef, where("question_id", "==", normalized_q_id));
                const existingDocs = await getDocs(q);

                if (!existingDocs.empty) {
                    throw new Error(`문제 업로드 실패: 고유번호 '${normalized_q_id}'는 이미 데이터베이스에 존재합니다. 전체 업로드를 무효화합니다.`);
                }
                
                const categories = category.split('/').map(c => c.trim());
                let parentDocId = null;

                for (let i = 0; i < categories.length; i++) {
                    const categoryName = categories[i];
                    const cacheKey = `${categoryName}-${parentDocId}`;

                    if (categoryCache.has(cacheKey)) {
                        parentDocId = categoryCache.get(cacheKey);
                        continue;
                    }

                    const catQuery = query(
                        categoriesRef,
                        where("name", "==", categoryName),
                        where("parent_document_id", "==", parentDocId)
                    );
                    
                    const querySnapshot = await getDocs(catQuery);
                    let categoryDocId;

                    if (!querySnapshot.empty) {
                        categoryDocId = querySnapshot.docs[0].id;
                    } else {
                        const docData = {
                            name: categoryName,
                            order: 0, 
                            depth: i,
                            parent_document_id: parentDocId,
                        };
                        const newDocRef = await addDoc(categoriesRef, docData);
                        categoryDocId = newDocRef.id;
                    }
                    parentDocId = categoryDocId;
                    categoryCache.set(cacheKey, categoryDocId);
                }
                
                const newDocRef = doc(questionsRef);
                batch.set(newDocRef, {
                    question_id: normalized_q_id,
                    question_text: question_text || '',
                    correct_answer: correct_answer && String(correct_answer).trim().toLowerCase() === "o", 
                    explanation: explanation || '',
                    hint: hint || '',
                    category_document_id: parentDocId,
                });
                questionCount++;
            }

            
            await batch.commit();
            window.appendLog(`총 ${questionCount}개의 문제가 성공적으로 업로드되었습니다. 카테고리 트리를 새로고침합니다.`, 'success');
            
            // 문제 업로드 후 카테고리도 변경되었을 수 있으므로 트리 새로고침
            // window.loadCategoriesToTree는 leftview.js에서 정의됨
            await window.loadCategoriesToTree();

        } catch (error) {
            
            window.appendLog(`문제 업로드 중 오류 발생 (전체 무효화): ${error.message}`, 'error');
        } finally {
            uploadQuestionBtn.disabled = false;
            event.target.value = '';
        }
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file, 'UTF-8');
    }
});
