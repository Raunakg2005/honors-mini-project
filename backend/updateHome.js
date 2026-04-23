const fs = require('fs');

let text = fs.readFileSync('../app/screens/HomeScreen.tsx', 'utf-8');

const replacement = `
  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(\`\${process.env.EXPO_PUBLIC_API_URL}/api/posts/\${postId}/like\`, {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${state.token}\` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(posts.map(p => p.id === postId ? { ...p, likesCount: data.likesCount, hasLiked: !p.hasLiked } : p));
      }
    } catch (e) {}
  };

  const handleRepost = async (postId: string) => {
    try {
      const res = await fetch(\`\${process.env.EXPO_PUBLIC_API_URL}/api/posts/\${postId}/repost\`, {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${state.token}\` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(posts.map(p => p.id === postId ? { ...p, repostsCount: data.repostsCount, hasReposted: true } : p));
      } else {
        alert("Already reposted");
      }
    } catch (e) {}
  };

  const handleComment = async (postId: string) => {
    const defaultComment = 'Great post!'; // Fake comment for MVP
    try {
      const res = await fetch(\`\${process.env.EXPO_PUBLIC_API_URL}/api/posts/\${postId}/comment\`, {
         method: 'POST',
         headers: { 
           'Authorization': \`Bearer \${state.token}\`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({ content: defaultComment })
      });
      if (res.ok) {
         const data = await res.json();
         setPosts(posts.map(p => p.id === postId ? { ...p, commentsCount: data.commentsCount } : p));
      }
    } catch (e) {}
  };

  const renderPost = `;

if (!text.includes('handleLike')) {
  text = text.replace('const renderPost = ', replacement);

  text = text.replace(/{item.likesCount}<\/Text>/, '{item.likesCount || 0}</Text>');
  text = text.replace('0 comments</Text>', '{item.commentsCount || 0} comments • {item.repostsCount || 0} reposts</Text>');

  text = text.replace(
    /<TouchableOpacity style={styles.actionButton}>\s*<Text style={styles.actionText}>👍 Like<\/Text>\s*<\/TouchableOpacity>/g,
    '<TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>\n        <Text style={[styles.actionText, item.hasLiked && { color: "#2563EB" }]}>👍 Like</Text>\n      </TouchableOpacity>'
  );

  text = text.replace(
    /<TouchableOpacity style={styles.actionButton}>\s*<Text style={styles.actionText}>💬 Comment<\/Text>\s*<\/TouchableOpacity>/g,
    '<TouchableOpacity style={styles.actionButton} onPress={() => handleComment(item.id)}>\n        <Text style={styles.actionText}>💬 Comment</Text>\n      </TouchableOpacity>'
  );

  text = text.replace(
    /<TouchableOpacity style={styles.actionButton}>\s*<Text style={styles.actionText}>🔁 Repost<\/Text>\s*<\/TouchableOpacity>/g,
    '<TouchableOpacity style={styles.actionButton} onPress={() => handleRepost(item.id)}>\n        <Text style={[styles.actionText, item.hasReposted && { color: "#10B981" }]}>🔁 Repost</Text>\n      </TouchableOpacity>'
  );

  fs.writeFileSync('../app/screens/HomeScreen.tsx', text);
  console.log("Done");
} else {
  console.log("Already updated");
}
