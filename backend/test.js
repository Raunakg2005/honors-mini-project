const jwt = require('jsonwebtoken');
async function test() {
  const token = jwt.sign({ userId: '041a85ec-89a0-4f0c-8829-176119ca4dbf' }, 'secret123');
  const posts = await fetch('http://localhost:4000/api/posts', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const data = await posts.json();
  console.log('Got posts:', data.length);
}
test();
