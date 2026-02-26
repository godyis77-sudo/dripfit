
DELETE FROM seed_posts WHERE username IN ('Jamie', 'Quinn');
INSERT INTO seed_posts (username, caption, image_url, like_count, is_public) VALUES
  ('Jamie', 'Formal Friday or too much?', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=900&fit=crop&crop=entropy', 87, true),
  ('Quinn', 'Going out top — keep or return?', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=900&fit=crop&crop=entropy', 72, true);
