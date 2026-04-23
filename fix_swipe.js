const fs = require('fs');
let data = fs.readFileSync('components/SwipeCard.tsx', 'utf8');
data = data.replace(/if \(!isTopCard\) \{[\s\S]*?<\/Animated\.View>\n  \);\n\};/m, 
`if (!isTopCard) {
    return (
      <View style={[styles.card, styles.nextCard]}>
        <Image source={{ uri: profile.avatarUrl }} style={styles.image} />
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.role}>{profile.role}</Text>
          {profile.company ? <Text style={styles.company}>at {profile.company}</Text> : null}
          <Text style={styles.industryLocation}>{profile.industry} • {profile.location}</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.card, animatedStyle]}
    >
      <Image source={{ uri: profile.avatarUrl }} style={styles.image} />
      
      {/* Feedback Labels */}
      <Animated.View style={[styles.feedbackLabel, styles.likeLabel, { opacity: likeOpacity }]}>
        <Text style={styles.likeText}>CONNECT</Text>
      </Animated.View>
      
      <Animated.View style={[styles.feedbackLabel, styles.nopeLabel, { opacity: nopeOpacity }]}>
        <Text style={styles.nopeText}>PASS</Text>
      </Animated.View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.role}>{profile.role || 'New Member'}</Text>
        {profile.company ? <Text style={styles.company}>at {profile.company}</Text> : null}
        <Text style={styles.industryLocation}>{profile.industry || ''} {profile.location ? \`• \${profile.location}\` : ''}</Text>
        {profile.bio ? <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text> : null}
        
        <View style={styles.skillsContainer}>
          {Array.isArray(profile.skills) ? profile.skills.slice(0, 4).map((skill, i) => (
            <Text key={i} style={styles.skillBadge}>{skill}</Text>
          )) : (typeof profile.skills === 'string' && profile.skills ? (profile.skills).split(',').slice(0, 4).map((skill, i) => (
            <Text key={i} style={styles.skillBadge}>{skill.trim()}</Text>
          )) : null)}
        </View>
      </View>
    </Animated.View>
  );
};`);

data += `\nstyles.company = { fontSize: 16, color: '#4B5563', fontWeight: '500' };`;
data += `\nstyles.bio = { fontSize: 14, color: '#374151', marginTop: 8, fontStyle: 'italic' };`;

data = data.replace(/height: 300,/g, 'height: 230,'); // Make image smaller

fs.writeFileSync('components/SwipeCard.tsx', data);
console.log("Swipe UI updated!");