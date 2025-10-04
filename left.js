// leftview.js

// === Global Dependency Injection (index.html에서 정의됨) ===
// 'db'와 'categoriesRef', 'categoryMap'은 index.html 스크립트에서 전역 변수로 정의되어야 합니다.
// 'appendLog'는 log.js에서 window 객체에 추가되어야 합니다.
// 'renderQuestionsForCategory'는 rightview.js에서 window 객체에 추가되어야 합니다.

// [수정] SVG 아이콘 정의 (index.html에서 재정의됨을 가정)
const SVG_TOP_LEVEL_GRID_ICON = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" y="14" rx="1"></rect></svg>`;
const SVG_MINUS_CIRCLE = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>`; 
const SVG_PLUS_CIRCLE = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;
const SVG_LEAF_NODE = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;

const STATE_KEYS = { SELECTED_CATEGORY: 'treeSelectedCategoryId' }; // 확장 상태 저장은 제거됨

// DOM 참조
const uploadCategoryBtn = document.getElementById('uploadCategoryBtn');
const categoryFileInput = document.getElementById('categoryFileInput');
const categoryTreeContainer = document.getElementById('categoryTree');
const loadingEl = document.getElementById('loading');
const errorDisplayEl = document.getElementById('error-display');
const errorTextDisplayEl = document.getElementById('error-text-display');

// Global Variables (index.html에서 정의되지만, 여기에서 재할당/접근이 일어날 수 있음)
let currentSelectedCategoryId = null;
let currentSelectedNode = null;


/**
 * 오류 메시지를 표시하고 로그에 기록합니다.
 */
function displayError(message) {
    errorTextDisplayEl.textContent = message;
    errorDisplayEl.classList.remove('hidden');
    loadingEl.classList.add('hidden');
    window.appendLog(`오류: ${message}`, 'error'); 
}

/**
 * 오류 표시를 숨깁니다.
 */
function hideError() {
    errorDisplayEl.classList.add('hidden');
}

// --- 조상 노드 스타일 관리 로직 ---
        
/**
 * 이전에 적용된 모든 'ancestor-selected' 클래스를 제거합니다.
 */
function clearAncestorStyles() {
    document.querySelectorAll('.tree-view .category-name.ancestor-selected').forEach(el => {
        el.classList.remove('ancestor-selected');
    });
}

/**
 * 현재 선택된 노드의 조상 노드들에 스타일을 적용합니다.
 * @param {string} selectedId - 현재 선택된 카테고리 ID
 */
function applyAncestorStyles(selectedId) {
    let currentId = selectedId;
    // index.html에서 정의된 window.categoryMap 사용
    while (currentId && window.categoryMap.has(currentId)) {
        const category = window.categoryMap.get(currentId);
        const nodeEl = document.querySelector(`.category-name[data-id="${currentId}"]`);
        
        // 현재 선택된 노드 자신을 제외한 모든 상위 노드에 스타일 적용
        if (nodeEl && currentId !== selectedId) {
            nodeEl.classList.add('ancestor-selected');
        }
        
        currentId = category.parent_document_id;
    }
}

// --- 트리 상태 관리 함수 ---

/**
 * 현재 선택된 카테고리 ID를 localStorage에 저장합니다.
 * @param {string | null} selectedId - 현재 선택된 카테고리 ID
 */
function saveTreeState(selectedId) {
    if (selectedId) {
        localStorage.setItem(STATE_KEYS.SELECTED_CATEGORY, selectedId);
    } else {
        localStorage.removeItem(STATE_KEYS.SELECTED_CATEGORY);
    }
}

/**
 * localStorage에서 저장된 트리 상태를 불러옵니다.
 * @returns {{selectedId: string | null}} 저장된 상태 객체
 */
function loadTreeState() {
    const selectedId = localStorage.getItem(STATE_KEYS.SELECTED_CATEGORY);
    return { selectedId }; 
}

/**
 * 저장된 상태를 기반으로 트리 뷰를 복원하고 퀴즈를 로드합니다. (전역 노출)
 * @param {Map<string, Object>} categoryMap - ID를 키로 하는 모든 카테고리 데이터 맵
 */
async function restoreTreeState(categoryMap) {
    const { selectedId } = loadTreeState(); 
    
    clearAncestorStyles();
    
    if (selectedId) {
        const selectedEl = document.querySelector(`.category-name[data-id="${selectedId}"]`);
        if (selectedEl) {
            
            if (currentSelectedNode) currentSelectedNode.classList.remove('selected');
            selectedEl.classList.add('selected');
            currentSelectedNode = selectedEl;
            
            applyAncestorStyles(selectedId);
            
            const ancestorIds = [];
            let currentId = selectedId;
            while (currentId && categoryMap.has(currentId)) {
                const category = categoryMap.get(currentId);
                ancestorIds.push(currentId);
                currentId = category.parent_document_id;
            }
            
            for (const id of ancestorIds) {
                const nodeEl = document.querySelector(`.category-name[data-id="${id}"]`);
                if (nodeEl) {
                    const childUl = nodeEl.nextElementSibling;
                    
                    const shouldExpand = (id !== selectedId) && (childUl && childUl.tagName === 'UL');
                    
                    if (childUl && childUl.tagName === 'UL') {
                        if (shouldExpand) {
                            nodeEl.classList.add('expanded');
                            childUl.classList.remove('hidden');
                            updateNodeIcon(nodeEl, true); 
                        } else {
                            updateNodeIcon(nodeEl, false);
                        }
                    } else {
                        updateNodeIcon(nodeEl, false);
                    }
                }
            }
            
            let categoryName = categoryMap.get(selectedId).name;

            // window.renderQuestionsForCategory는 rightview.js에서 정의됨
            await window.renderQuestionsForCategory(selectedId, categoryName);
            
            currentSelectedCategoryId = selectedId;
            
            window.appendLog(`이전 상태가 복원되었습니다: 카테고리 '${categoryName}' 선택 및 조상 노드 확장됨.`, 'status');
        } else {
            saveTreeState(null);
        }
    }
}

/**
 * 확장/축소 상태 및 최하위 노드에 따라 아이콘을 반환합니다. 
 */
function getCategoryIcon(item, isExpanded, hasChildren) {
    
    if (item.depth === -1) { 
        return SVG_TOP_LEVEL_GRID_ICON; 
    }
    
    if (!hasChildren) {
        return SVG_LEAF_NODE; 
    } 
    
    if (isExpanded) {
         return SVG_MINUS_CIRCLE; 
    } else {
         return SVG_PLUS_CIRCLE; 
    }
}

/**
 * 노드 아이콘을 업데이트합니다.
 */
function updateNodeIcon(categoryNameSpan, isExpanded) {
    const iconSpan = categoryNameSpan.querySelector('.category-icon');
    if (!iconSpan) return;

    const hasChildrenInDOM = categoryNameSpan.nextElementSibling && categoryNameSpan.nextElementSibling.tagName === 'UL';
    const depth = categoryNameSpan.dataset.id ? 0 : -1;
    const item = { depth: depth };
    
    const newIconHTMLOrText = getCategoryIcon(item, isExpanded, hasChildrenInDOM); 

    if (newIconHTMLOrText.startsWith('<svg')) {
        iconSpan.innerHTML = newIconHTMLOrText;
        iconSpan.classList.add('flex', 'items-center', 'justify-center');
        iconSpan.classList.remove('text-lg'); 
        
    } else {
        iconSpan.textContent = newIconHTMLOrText;
        iconSpan.classList.remove('flex', 'items-center', 'justify-center');
    }
}

function createTree(items) {
    const ul = document.createElement('ul');
    items.forEach(item => {
        const li = document.createElement('li');
        const categoryNameSpan = document.createElement('span');
        categoryNameSpan.className = 'category-name';
        
        if (item.id !== 'top-category-node') {
            categoryNameSpan.dataset.id = item.id;
        }

        const hasChildren = item.children && item.children.length > 0;
        const isInitiallyExpanded = item.id === 'top-category-node'; 
        
        const initialIcon = getCategoryIcon(item, isInitiallyExpanded, hasChildren); 
        const iconSpan = document.createElement('span');
        iconSpan.className = 'category-icon mr-1';
        
        if (initialIcon.startsWith('<svg')) {
            iconSpan.innerHTML = initialIcon;
            iconSpan.classList.add('flex', 'items-center', 'justify-center');
        } else {
            iconSpan.textContent = initialIcon;
        }
        
        categoryNameSpan.appendChild(iconSpan);
        categoryNameSpan.appendChild(document.createTextNode(item.name));
        
        li.appendChild(categoryNameSpan);

        const handleNodeClick = () => {
            if (item.id === 'top-category-node') {
                return;
            }
            
            clearAncestorStyles();
            
            if (currentSelectedNode) currentSelectedNode.classList.remove('selected');
            categoryNameSpan.classList.add('selected');
            currentSelectedNode = categoryNameSpan;
            
            applyAncestorStyles(item.id); 
            
            let categoryName = item.name;

            // window.renderQuestionsForCategory는 rightview.js에서 정의됨
            window.renderQuestionsForCategory(item.id, categoryName);
            saveTreeState(item.id); 
        };

        if (hasChildren) {
            const childUl = createTree(item.children);
            
            if (!isInitiallyExpanded) {
                childUl.classList.add('hidden');
            } else {
                categoryNameSpan.classList.add('expanded');
            }
            
            li.appendChild(childUl);
            
            categoryNameSpan.addEventListener('click', (e) => {
                // 이벤트 전파 방지 (e.stopPropagation()이 없으므로, 모든 클릭은 handleNodeClick을 통해 처리됨)
                
                // 1. 클릭 시 퀴즈 로드 및 선택 상태 저장
                handleNodeClick();
                
                // 2. 확장 상태 토글 
                const isCurrentlyExpanded = categoryNameSpan.classList.toggle('expanded');
                childUl.classList.toggle('hidden');
                
                // 3. 아이콘 업데이트
                updateNodeIcon(categoryNameSpan, isCurrentlyExpanded);
            });
            
        } else {
            categoryNameSpan.classList.add('no-children');
            categoryNameSpan.addEventListener('click', handleNodeClick);
        }
        ul.appendChild(li);
    });
    return ul;
}

/**
 * Firestore에서 카테고리를 가져와 트리 구조를 만듭니다. 
 */
async function fetchCategoriesAsTree() {
    try {
        hideError();
        // window.categoriesRef는 index.html에서 정의됨
        const categorySnapshot = await window.getDocs(window.categoriesRef);
        const fetchedMap = new Map();
        const rootCategories = [];

        categorySnapshot.forEach(doc => {
            const data = doc.data();
            fetchedMap.set(doc.id, { id: doc.id, ...data, children: [] });
        });

        fetchedMap.forEach(category => {
            if (category.parent_document_id) {
                if (fetchedMap.has(category.parent_document_id)) {
                     fetchedMap.get(category.parent_document_id).children.push(category);
                } else {
                    rootCategories.push(category);
                }
            }
            else if (!category.parent_document_id) { 
                rootCategories.push(category);
            }
        });

        const sortChildren = (list) => {
            list.sort((a, b) => a.order - b.order);
            list.forEach(c => c.children.length && sortChildren(c.children));
        };
        sortChildren(rootCategories);

        const topLevelNode = {
            id: 'top-category-node',
            name: '카테고리',
            children: rootCategories,
            depth: -1,
        };
        
        return { tree: [topLevelNode], map: fetchedMap }; 

    } catch (error) {
        displayError(`카테고리 데이터를 불러오는 데 실패했습니다: ${error.message}`);
        return { tree: [], map: new Map() };
    }
}

/**
 * 카테고리 트리를 로드하고 상태를 복원합니다. (전역 노출)
 */
window.loadCategoriesToTree = async function() {
    // window.categoryMap은 index.html에서 전역으로 정의됨
    const { tree: categoriesData, map: fetchedMap } = await fetchCategoriesAsTree();
    window.categoryMap = fetchedMap;
    
    loadingEl.classList.add('hidden');
    categoryTreeContainer.innerHTML = '';
    if (categoriesData.length > 0) {
        categoryTreeContainer.appendChild(createTree(categoriesData));
        await restoreTreeState(window.categoryMap); 
    } else if (errorDisplayEl.classList.contains('hidden')) {
        displayError('표시할 카테고리 데이터가 없습니다.');
    }
}

// --- 이벤트 리스너 (카테고리 업로드) ---

uploadCategoryBtn.addEventListener('click', () => {
    categoryFileInput.click();
});

categoryFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    hideError();

    uploadCategoryBtn.disabled = true;

    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            // Firestore 관련 함수는 index.html에서 전역으로 정의됨
            const { db, categoriesRef, writeBatch, getDocs, query, where, addDoc } = window;
            
            const fileContent = e.target.result;
            const paths = fileContent.split('\n').map(line => line.trim()).filter(line => line);
            
            const existingCategories = await getDocs(categoriesRef);
            const batch = writeBatch(db);
            existingCategories.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            
            const childOrderMap = new Map();
            const categoryCache = new Map();
            let categoriesUploaded = 0;
            
            for (const path of paths) {
                const categories = path.split('/').map(c => c.trim());
                
                let parentDocId = null;
                for (let i = 0; i < categories.length; i++) {
                    const categoryName = categories[i];
                    const cacheKey = `${categoryName}-${parentDocId}`;
                    
                    if (categoryCache.has(cacheKey)) {
                        parentDocId = categoryCache.get(cacheKey);
                        continue;
                    }

                    const q = query(
                        categoriesRef,
                        where("name", "==", categoryName),
                        where("parent_document_id", "==", parentDocId)
                    );
                    
                    const querySnapshot = await getDocs(q);
                    let categoryDocId;

                    if (!querySnapshot.empty) {
                        categoryDocId = querySnapshot.docs[0].id;
                    } else {
                        const currentOrder = childOrderMap.get(parentDocId) || 0;
                        const docData = {
                            name: categoryName,
                            order: currentOrder,
                            depth: i,
                            parent_document_id: parentDocId,
                        };
                        const newDocRef = await addDoc(categoriesRef, docData);
                        categoryDocId = newDocRef.id;
                        childOrderMap.set(parentDocId, currentOrder + 1);
                        categoriesUploaded++;
                    }
                    parentDocId = categoryDocId;
                    categoryCache.set(cacheKey, categoryDocId);
                }
            }
            
            await window.loadCategoriesToTree();
            window.appendLog(`총 ${categoriesUploaded}개의 카테고리 노드가 생성 또는 업데이트되었습니다.`, 'success');

        } catch (error) {
            
            window.appendLog(`카테고리 업로드 중 오류가 발생했습니다: ${error.message}`, 'error');
        } finally {
            uploadCategoryBtn.disabled = false;
        }
    };
    
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
});

// window.restoreTreeState를 초기 로딩 시 호출하기 위해 전역 노출
window.restoreTreeState = restoreTreeState;
