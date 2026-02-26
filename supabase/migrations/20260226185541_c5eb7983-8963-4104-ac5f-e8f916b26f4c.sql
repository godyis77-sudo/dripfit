
-- Temporarily allow admin delete/insert on seed_posts for fixing images
DELETE FROM seed_posts WHERE username IN ('Quinn', 'Taylor', 'Jamie');

INSERT INTO seed_posts (username, caption, image_url, like_count, is_public)
VALUES 
  ('Jamie', 'Formal Friday or too much?', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&h=750&fit=crop', 87, true),
  ('Quinn', 'Going out top — keep or return?', 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=600&h=750&fit=crop', 72, true),
  ('Taylor', 'Weekend casual?', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&h=750&fit=crop', 47, true);
