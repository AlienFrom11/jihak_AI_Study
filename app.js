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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', () => {
    const postForm = document.getElementById('post-form');
    const postList = document.getElementById('post-list');
    const postSubmitBtn = document.getElementById('post-submit-btn');

    // 파일 유효성 검사 함수
    const validateFile = (file) => {
        if (!file) return true; // 파일이 선택되지 않은 경우는 패스 (필수가 아님)

        // 이미지 타입 검사
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return false;
        }

        // 파일 크기 제한 (5MB = 5 * 1024 * 1024 bytes)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            alert('파일 크기는 5MB 이하여야 합니다.');
            return false;
        }

        return true;
    };

    // 이미지 업로드 함수
    const uploadImage = async (file) => {
        if (!file) return null;
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `images/${fileName}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    };

    // 게시글 작성 폼 제출 이벤트 처리
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        const imageFile = document.getElementById('post-image').files[0];

        // 유효성 검사
        if (!validateFile(imageFile)) {
            return;
        }

        try {
            // 연타 방지: 버튼 비활성화
            postSubmitBtn.disabled = true;
            postSubmitBtn.textContent = '등록 중...';

            let imageUrl = null;
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            await addDoc(collection(db, 'posts'), {
                title: title,
                content: content,
                imageUrl: imageUrl,
                createdAt: serverTimestamp()
            });
            
            alert('게시글이 성공적으로 등록되었습니다!');
            postForm.reset();
        } catch (error) {
            console.error('게시글 등록 중 오류 발생:', error);
            alert('게시글 등록에 실패했습니다.');
        } finally {
            // 버튼 활성화 복구
            postSubmitBtn.disabled = false;
            postSubmitBtn.textContent = '게시글 등록';
        }
    });

    // 게시글 및 댓글 렌더링을 위한 실시간 리스너
    const loadPosts = () => {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        onSnapshot(q, (snapshot) => {
            postList.innerHTML = ''; // 초기화
            snapshot.forEach((postDoc) => {
                const post = postDoc.data();
                const postId = postDoc.id;

                const article = document.createElement('article');
                article.className = 'post-item';

                // 이미지 영역 처리
                let imageHtml = '';
                if (post.imageUrl) {
                    imageHtml = `<div class="post-item-image"><img src="${post.imageUrl}" alt="첨부 이미지"></div>`;
                }

                // 댓글 렌더링 컨테이너
                const commentsHtml = `
                    <div class="comments-section">
                        <h4>댓글</h4>
                        <ul class="comment-list" id="comment-list-${postId}">
                            <!-- 댓글이 실시간으로 로드됩니다 -->
                        </ul>
                        <form class="comment-form" data-post-id="${postId}">
                            <input type="text" class="comment-input" placeholder="댓글을 입력하세요" required>
                            <button type="submit" class="btn btn-small comment-submit-btn">댓글 작성</button>
                        </form>
                    </div>
                `;

                article.innerHTML = `
                    <h3 class="post-item-title">${escapeHtml(post.title)}</h3>
                    <p class="post-item-content">${escapeHtml(post.content)}</p>
                    ${imageHtml}
                    ${commentsHtml}
                `;

                postList.appendChild(article);

                // 각 게시글에 대한 댓글 실시간 리스너 등록
                loadComments(postId);
            });
        }, (error) => {
            console.error("게시글을 불러오는 중 오류 발생:", error);
        });
    };

    const loadComments = (postId) => {
        const commentsQ = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
        onSnapshot(commentsQ, (snapshot) => {
            const commentListEl = document.getElementById(`comment-list-${postId}`);
            if (commentListEl) {
                commentListEl.innerHTML = '';
                snapshot.forEach((commentDoc) => {
                    const comment = commentDoc.data();
                    const li = document.createElement('li');
                    li.className = 'comment-item';
                    li.innerHTML = `<span class="comment-author">익명:</span> ${escapeHtml(comment.text)}`;
                    commentListEl.appendChild(li);
                });
            }
        });
    };

    // 댓글 작성 폼 제출 이벤트 처리
    postList.addEventListener('submit', async (e) => {
        if (e.target.classList.contains('comment-form')) {
            e.preventDefault();
            
            const form = e.target;
            const postId = form.getAttribute('data-post-id');
            const commentInput = form.querySelector('.comment-input');
            const submitBtn = form.querySelector('.comment-submit-btn');
            const commentText = commentInput.value;
            
            try {
                // 연타 방지
                submitBtn.disabled = true;
                submitBtn.textContent = '작성 중...';

                await addDoc(collection(db, 'posts', postId, 'comments'), {
                    text: commentText,
                    createdAt: serverTimestamp()
                });
                
                form.reset();
            } catch (error) {
                console.error('댓글 등록 중 오류 발생:', error);
                alert('댓글 등록에 실패했습니다.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '댓글 작성';
            }
        }
    });

    // 간단한 HTML 이스케이프 함수 (XSS 방지용)
    const escapeHtml = (unsafe) => {
        return (unsafe || '')
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    // 초기 게시글 로드
    loadPosts();
});
