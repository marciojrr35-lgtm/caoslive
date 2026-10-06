const createPostBtn = document.getElementById("createPostBtn");
const createPostBtn2 = document.getElementById("createPostBtn2");
const postModal = document.getElementById("postModal");
const closeModal = document.getElementById("closeModal");
const postForm = document.getElementById("postForm");
const feed = document.getElementById("feed");
const semPostagens = document.getElementById("sem-postagens");

let posts = JSON.parse(localStorage.getItem("caoslive_posts")) || [];

function abrirModal() {
  postModal.classList.add("active");
}

function fecharModal() {
  postModal.classList.remove("active");
}

createPostBtn.addEventListener("click", abrirModal);
createPostBtn2.addEventListener("click", abrirModal);
closeModal.addEventListener("click", fecharModal);

postModal.addEventListener("click", function (e) {
  if (e.target === postModal) {
    fecharModal();
  }
});

postForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const author = document.getElementById("author").value.trim();
  const text = document.getElementById("postText").value.trim();
  const imageUrl = document.getElementById("imageUrl").value.trim();

  if (!author || !text) {
    alert("Preencha seu nome e a mensagem.");
    return;
  }

  const post = {
    id: Date.now(),
    author: author,
    text: text,
    image: imageUrl,
    date: new Date().toLocaleString("pt-BR")
  };

  posts.unshift(post);

  localStorage.setItem("caoslive_posts", JSON.stringify(posts));

  postForm.reset();
  fecharModal();
  mostrarPosts();
});

function mostrarPosts() {
  feed.innerHTML = "";

  if (posts.length === 0) {
    semPostagens.style.display = "block";
    return;
  }

  semPostagens.style.display = "none";

  posts.forEach(function (post) {
    const div = document.createElement("div");
    div.className = "post";

    div.innerHTML = `
      <h3>${escapar(post.author)}</h3>
      <small>${post.date}</small>
      <p>${escapar(post.text)}</p>

      ${
        post.image
          ? `<img src="${escapar(post.image)}" alt="Imagem da postagem">`
          : ""
      }

      <div class="post-acoes">
        <button onclick="salvarRecordacao(${post.id})">
          ⭐ Recordação
        </button>

        <button onclick="apagarPost(${post.id})">
          🗑️ Apagar
        </button>
      </div>
    `;

    feed.appendChild(div);
  });
}

function apagarPost(id) {
  posts = posts.filter(function (post) {
    return post.id !== id;
  });

  localStorage.setItem("caoslive_posts", JSON
