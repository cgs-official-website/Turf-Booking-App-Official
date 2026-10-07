import os
from PIL import Image, ImageDraw
import numpy as np

def generate_icons():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_path = os.path.join(base_dir, 'logo.png')
    
    if not os.path.exists(logo_path):
        raise FileNotFoundError(f"logo.png not found at {logo_path}")
        
    img = Image.open(logo_path).convert('RGB')
    arr = np.array(img)
    
    # ── 1. Create Silhouette for ic_notification.png ──
    # Logo graphic bounds:
    crop = arr[165:1060, 195:1050]
    
    # Foreground pixels are green/dark (any channel < 225)
    # Background/cutouts are white (> 225 in all channels)
    h, w = crop.shape[:2]
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    
    # High-quality anti-aliasing based on luminance inversion
    gray = 0.299 * crop[:, :, 0] + 0.587 * crop[:, :, 1] + 0.114 * crop[:, :, 2]
    alpha = np.clip((245.0 - gray) * 3.5, 0, 255).astype(np.uint8)
    
    rgba[:, :, 0] = 255
    rgba[:, :, 1] = 255
    rgba[:, :, 2] = 255
    rgba[:, :, 3] = alpha
    
    sil_img = Image.fromarray(rgba, 'RGBA')
    
    # Fit into a square with standard 15% notification padding
    max_dim = max(h, w)
    pad = int(max_dim * 0.15)
    sq_size = max_dim + (pad * 2)
    square_sil = Image.new('RGBA', (sq_size, sq_size), (0, 0, 0, 0))
    offset_x = (sq_size - w) // 2
    offset_y = (sq_size - h) // 2
    square_sil.paste(sil_img, (offset_x, offset_y), sil_img)
    
    # ── 2. Create Full-Color Large Notification & Launcher Icons ──
    # Crop the rounded squircle card from logo.png
    # Find card bounding box (where pixels differ from outer border)
    # In logo.png, the card is centered
    logo_rgba = Image.open(logo_path).convert('RGBA')
    
    # Circular version for ic_launcher_round
    logo_round = Image.new('RGBA', logo_rgba.size, (0, 0, 0, 0))
    round_mask = Image.new('L', logo_rgba.size, 0)
    draw_round = ImageDraw.Draw(round_mask)
    # Circular crop in center
    cx, cy = logo_rgba.width // 2, logo_rgba.height // 2
    radius = int(min(cx, cy) * 0.96)
    draw_round.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=255)
    logo_round.paste(logo_rgba, (0, 0), round_mask)
    
    # ── Density Sizes ──
    notification_sizes = {
        'drawable': 96,
        'drawable-mdpi': 24,
        'drawable-hdpi': 36,
        'drawable-xhdpi': 48,
        'drawable-xxhdpi': 72,
        'drawable-xxxhdpi': 96,
    }
    
    large_notif_sizes = {
        'drawable': 256,
        'drawable-mdpi': 64,
        'drawable-hdpi': 96,
        'drawable-xhdpi': 128,
        'drawable-xxhdpi': 192,
        'drawable-xxxhdpi': 256,
    }
    
    launcher_sizes = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192,
    }
    
    apps = ['TurfUserApp', 'TurfVendorApp']
    
    for app in apps:
        app_res = os.path.join(base_dir, app, 'android', 'app', 'src', 'main', 'res')
        
        # 1. Save ic_notification.png
        for folder, sz in notification_sizes.items():
            target_dir = os.path.join(app_res, folder)
            os.makedirs(target_dir, exist_ok=True)
            resized = square_sil.resize((sz, sz), Image.Resampling.LANCZOS)
            out_file = os.path.join(target_dir, 'ic_notification.png')
            resized.save(out_file, 'PNG')
            print(f"[{app}] Saved {folder}/ic_notification.png ({sz}x{sz})")
            
        # 2. Save ic_notification_large.png
        for folder, sz in large_notif_sizes.items():
            target_dir = os.path.join(app_res, folder)
            os.makedirs(target_dir, exist_ok=True)
            resized = logo_rgba.resize((sz, sz), Image.Resampling.LANCZOS)
            out_file = os.path.join(target_dir, 'ic_notification_large.png')
            resized.save(out_file, 'PNG')
            print(f"[{app}] Saved {folder}/ic_notification_large.png ({sz}x{sz})")
            
        # 3. Save ic_launcher.png & ic_launcher_round.png
        for folder, sz in launcher_sizes.items():
            target_dir = os.path.join(app_res, folder)
            os.makedirs(target_dir, exist_ok=True)
            
            launcher_img = logo_rgba.resize((sz, sz), Image.Resampling.LANCZOS)
            launcher_img.save(os.path.join(target_dir, 'ic_launcher.png'), 'PNG')
            
            round_img = logo_round.resize((sz, sz), Image.Resampling.LANCZOS)
            round_img.save(os.path.join(target_dir, 'ic_launcher_round.png'), 'PNG')
            print(f"[{app}] Saved {folder}/ic_launcher.png & ic_launcher_round.png ({sz}x{sz})")
            
    print("\nAll notification and launcher icons successfully generated for both apps!")

if __name__ == '__main__':
    generate_icons()
