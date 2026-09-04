// app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { 
    getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzbuP6GUpabOa1MEiTXJ4I6dWnisqBiP8",
    authDomain: "ai-study-jihak.firebaseapp.com",
    databaseURL: "https://ai-study-jihak-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ai-study-jihak",
    storageBucket: "ai-study-jihak.firebasestorage.app",
    messagingSenderId: "754034374959",
    appId: "1:754034374959:web:a476db220dd7a78dc2c9da",
    measurementId: "G-6W4XQS3J10"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', () => {
    const postForm = document.getElementById('post-form');
    const postList = document.getElementById('post-list');
    const postSubmitBtn = document.getElementById('post-submit-btn');
    const postImageInput = document.getElementById('post-image');
    const fileNameEl = document.getElementById('file-name');
    const openFormBtn = document.getElementById('open-form-btn');
    const postFormSection = document.getElementById('post-form-section');

    // 선택한 파일 이름 표시
    postImageInput.addEventListener('change', () => {
        const file = postImageInput.files[0];
        if (file) {
            fileNameEl.textContent = `📎 ${file.name}`;
            fileNameEl.hidden = false;
        } else {
            fileNameEl.hidden = true;
        }
    });

    // 상단 + 버튼 → 작성 폼으로 스크롤 & 포커스
    openFormBtn.addEventListener('click', () => {
        postFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('post-title').focus();
    });

    // 하트(좋아요) 토글
    postList.addEventListener('click', (e) => {
        const heart = e.target.closest('.icon-heart');
        if (heart) heart.classList.toggle('liked');
    });

    const withTimeout = (promise, ms = 5000) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
        ]);
    };

    const escapeHtml = (unsafe) => {
        return (unsafe || '')
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    const validateFile = (file) => {
        if (!file) return true;
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return false;
        }
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            alert('파일 크기는 5MB 이하여야 합니다.');
            return false;
        }
        return true;
    };

    const uploadImage = async (file) => {
        if (!file) return null;
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `images/${fileName}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        const imageFile = document.getElementById('post-image').files[0];

        if (!validateFile(imageFile)) return;

        try {
            postSubmitBtn.disabled = true;
            postSubmitBtn.textContent = '등록 중...';

            let imageUrl = null;
            if (imageFile) {
                imageUrl = await withTimeout(uploadImage(imageFile));
            }

            await withTimeout(addDoc(collection(db, 'posts'), {
                title: title,
                content: content,
                imageUrl: imageUrl,
                createdAt: serverTimestamp()
            }));
            
            postForm.reset();
            fileNameEl.hidden = true;
        } catch (error) {
            console.error('게시글 등록 중 오류 발생:', error);
            if (error.message === 'TIMEOUT') {
                alert('서버 응답 지연: Firebase 콘솔에서 Firestore가 생성되었는지 확인하세요.');
            } else {
                alert('게시글 등록에 실패했습니다. Firebase 권한이나 설정을 확인하세요.');
            }
        } finally {
            postSubmitBtn.disabled = false;
            postSubmitBtn.textContent = '게시글 등록';
        }
    });

    // 실시간 리스너 (docChanges 활용하여 메모리 누수 및 DOM 파괴 방지)
    const loadPosts = () => {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        
        onSnapshot(q, (snapshot) => {
            if (postList.innerHTML.includes("임시 데이터")) {
                postList.innerHTML = ''; 
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const post = change.doc.data();
                    const postId = change.doc.id;

                    const article = document.createElement('article');
                    article.className = 'post-item';
                    article.id = `post-${postId}`;

                    let imageHtml = '';
                    if (post.imageUrl) {
                        imageHtml = `<div class="post-item-image"><img src="${escapeHtml(post.imageUrl)}" alt="첨부 이미지"></div>`;
                    }

                    article.innerHTML = `
                        <header class="post-head">
                            <div class="avatar" aria-hidden="true"></div>
                            <span class="post-item-title">${escapeHtml(post.title)}</span>
                        </header>
                        ${imageHtml}
                        <div class="post-actions">
                            <svg class="icon-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        </div>
                        <div class="post-body">
                            <p class="post-item-content">${escapeHtml(post.content)}</p>
                        </div>
                        <div class="comments-section">
                            <ul class="comment-list" id="comment-list-${postId}"></ul>
                            <form class="comment-form" data-post-id="${postId}">
                                <input type="text" class="comment-input" placeholder="댓글 달기..." required>
                                <button type="submit" class="comment-submit-btn">게시</button>
                            </form>
                        </div>
                    `;

                    // 최신 글이 위로 가도록 삽입
                    if (postList.firstChild) {
                        postList.insertBefore(article, postList.firstChild);
                    } else {
                        postList.appendChild(article);
                    }

                    loadComments(postId);
                }
            });
        }, (error) => {
            console.error("게시글 로드 오류:", error);
        });
    };

    const loadComments = (postId) => {
        const commentsQ = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
        onSnapshot(commentsQ, (snapshot) => {
            const commentListEl = document.getElementById(`comment-list-${postId}`);
            if (!commentListEl) return;

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const comment = change.doc.data();
                    const li = document.createElement('li');
                    li.className = 'comment-item';
                    li.innerHTML = `<span class="comment-author">익명</span>${escapeHtml(comment.text)}`;
                    commentListEl.appendChild(li);
                }
            });
        });
    };

    postList.addEventListener('submit', async (e) => {
        if (e.target.classList.contains('comment-form')) {
            e.preventDefault();
            
            const form = e.target;
            const postId = form.getAttribute('data-post-id');
            const commentInput = form.querySelector('.comment-input');
            const submitBtn = form.querySelector('.comment-submit-btn');
            const commentText = commentInput.value;
            
            try {
                submitBtn.disabled = true;
                submitBtn.textContent = '작성 중...';

                await withTimeout(addDoc(collection(db, 'posts', postId, 'comments'), {
                    text: commentText,
                    createdAt: serverTimestamp()
                }));
                
                form.reset();
            } catch (error) {
                console.error('댓글 등록 중 오류 발생:', error);
                if (error.message === 'TIMEOUT') {
                    alert('서버 응답 지연: Firebase 콘솔에서 Firestore가 생성되었는지 확인하세요.');
                } else {
                    alert('댓글 등록에 실패했습니다.');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '댓글 작성';
            }
        }
    });

    loadPosts();
});
