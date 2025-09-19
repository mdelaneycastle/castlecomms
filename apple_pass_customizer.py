#!/usr/bin/env python3
import os
import json
import shutil
from flask import Flask, request, jsonify, render_template_string, send_from_directory
from werkzeug.utils import secure_filename
from datetime import datetime
import configparser
from PIL import Image
import io

app = Flask(__name__)

UPLOAD_FOLDER = 'wallettest/custom_assets'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Apple Wallet image specifications
IMAGE_SPECS = {
    'logo': {'width': 160, 'height': 50, 'required': True},
    'strip': {'width': 375, 'height': 123, 'required': True}, 
    'background': {'width': 180, 'height': 220, 'required': True},
    'icon': {'width': 29, 'height': 29, 'required': True}
}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def hex_to_rgb(hex_color):
    """Convert hex color to rgb format for Apple Wallet"""
    hex_color = hex_color.lstrip('#')
    return f"rgb({int(hex_color[0:2], 16)}, {int(hex_color[2:4], 16)}, {int(hex_color[4:6], 16)})"

def validate_image_dimensions(image_file, image_type):
    """Validate image dimensions against Apple Wallet specs"""
    try:
        image = Image.open(image_file)
        width, height = image.size
        spec = IMAGE_SPECS.get(image_type)
        
        if not spec:
            return False, f"Unknown image type: {image_type}"
        
        expected_width = spec['width']
        expected_height = spec['height']
        
        if width != expected_width or height != expected_height:
            return False, f"{image_type.title()} must be exactly {expected_width}x{expected_height}px (got {width}x{height}px)"
        
        return True, "Valid dimensions"
    except Exception as e:
        return False, f"Error validating image: {str(e)}"

def generate_retina_variants(image_path, image_type):
    """Generate @2x and @3x variants for Apple Wallet"""
    try:
        base_image = Image.open(image_path)
        base_name = os.path.splitext(image_path)[0]
        
        # Generate @2x (2x resolution)
        retina_2x = base_image.resize((base_image.width * 2, base_image.height * 2), Image.Resampling.LANCZOS)
        retina_2x_path = f"{base_name}@2x.png"
        retina_2x.save(retina_2x_path, "PNG", optimize=True)
        
        # Generate @3x (3x resolution)  
        retina_3x = base_image.resize((base_image.width * 3, base_image.height * 3), Image.Resampling.LANCZOS)
        retina_3x_path = f"{base_name}@3x.png"
        retina_3x.save(retina_3x_path, "PNG", optimize=True)
        
        print(f"✅ Generated retina variants for {image_type}: @2x and @3x")
        return True
        
    except Exception as e:
        print(f"❌ Error generating retina variants: {e}")
        return False

def ensure_upload_folder():
    upload_path = os.path.join(BASE_DIR, UPLOAD_FOLDER)
    os.makedirs(upload_path, exist_ok=True)
    return upload_path

def load_current_config():
    """Load current pass customization settings"""
    # Try different possible locations for the config file
    possible_paths = [
        os.path.join(BASE_DIR, 'wallettest', 'pass_config.json'),  # From main dir
        os.path.join(os.path.dirname(BASE_DIR), 'wallettest', 'pass_config.json'),  # From wallettest dir
        os.path.join('.', 'pass_config.json'),  # Same directory
        os.path.join('..', 'wallettest', 'pass_config.json')  # Parent/wallettest
    ]
    
    config_file = None
    for path in possible_paths:
        if os.path.exists(path):
            config_file = path
            break
    
    default_config = {
        "backgroundColor": "rgb(0, 0, 0)",  # Default to black if no color specified
        "foregroundColor": "rgb(255, 255, 255)",
        "labelColor": "rgb(255, 255, 255)",
        "logo": None,
        "strip": None,
        "background": None,
        "lastUpdated": None
    }
    
    if config_file and os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
                # Merge with defaults to ensure all keys exist
                for key in default_config:
                    if key not in config:
                        config[key] = default_config[key]
                print(f"🎨 Config loaded from: {config_file}")
                return config
        except Exception as e:
            print(f"❌ Error loading config from {config_file}: {e}")
    
    print(f"⚠️ No config file found, using defaults. Searched: {possible_paths}")
    return default_config

def save_config(config_data):
    """Save pass customization settings"""
    config_file = os.path.join(BASE_DIR, 'wallettest', 'pass_config.json')
    config_data['lastUpdated'] = datetime.now().isoformat()
    
    with open(config_file, 'w') as f:
        json.dump(config_data, f, indent=4)
    
    return True

@app.route('/')
def index():
    """Serve the customization form"""
    html_file = os.path.join(BASE_DIR, 'apple-pass-customizer.html')
    with open(html_file, 'r') as f:
        return f.read()

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get current pass configuration"""
    return jsonify(load_current_config())

@app.route('/api/customize', methods=['POST'])
def customize_pass():
    """Handle pass customization form submission"""
    try:
        ensure_upload_folder()
        config = load_current_config()
        
        # Handle file uploads with dimension validation
        for file_type in ['logo', 'strip', 'background']:
            if file_type in request.files:
                file = request.files[file_type]
                if file and file.filename and allowed_file(file.filename):
                    # Reset file pointer for validation
                    file.seek(0)
                    
                    # Validate image dimensions
                    is_valid, validation_message = validate_image_dimensions(file, file_type)
                    if not is_valid:
                        return jsonify({
                            'success': False,
                            'message': f'Image validation failed: {validation_message}'
                        }), 400
                    
                    # Reset file pointer for saving
                    file.seek(0)
                    
                    filename = secure_filename(f"{file_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
                    file_path = os.path.join(ensure_upload_folder(), filename)
                    
                    # Save as PNG for consistency
                    image = Image.open(file)
                    image.save(file_path, "PNG", optimize=True)
                    
                    # Generate retina variants
                    generate_retina_variants(file_path, file_type)
                    
                    # Copy to wallettest directory for immediate use (base resolution)
                    wallettest_path = os.path.join(BASE_DIR, 'wallettest', f"{file_type}.png")
                    shutil.copy(file_path, wallettest_path)
                    
                    # Also copy retina variants to wallettest
                    base_name = os.path.splitext(file_path)[0]
                    for variant in ['@2x', '@3x']:
                        variant_src = f"{base_name}{variant}.png"
                        variant_dst = os.path.join(BASE_DIR, 'wallettest', f"{file_type}{variant}.png")
                        if os.path.exists(variant_src):
                            shutil.copy(variant_src, variant_dst)
                    
                    config[file_type] = filename
                    print(f"✅ {file_type.title()} uploaded and validated: {filename}")
        
        # Handle color settings (convert hex to rgb if needed)
        if 'backgroundColor' in request.form:
            bg_color = request.form['backgroundColor']
            if bg_color.startswith('#'):
                # Convert hex to rgb for Apple Wallet
                config['backgroundColor'] = hex_to_rgb(bg_color)
            else:
                config['backgroundColor'] = bg_color
                
        if 'foregroundColor' in request.form:
            fg_color = request.form['foregroundColor']
            if fg_color.startswith('#'):
                # Convert hex to rgb for Apple Wallet
                rgb_color = hex_to_rgb(fg_color)
                config['foregroundColor'] = rgb_color
                config['labelColor'] = rgb_color  # Use same color for labels
            else:
                config['foregroundColor'] = fg_color
                config['labelColor'] = fg_color
        
        # Save configuration
        save_config(config)
        
        return jsonify({
            'success': True,
            'message': 'Pass customization saved successfully!',
            'config': config
        })
    
    except Exception as e:
        print(f"Error in customize_pass: {e}")
        return jsonify({
            'success': False,
            'message': f'Error saving customization: {str(e)}'
        }), 500

@app.route('/api/assets/<filename>')
def get_asset(filename):
    """Serve uploaded asset files"""
    try:
        upload_path = ensure_upload_folder()
        return send_from_directory(upload_path, filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

def apply_customizations_to_pass(pass_json, config=None):
    """Apply customizations to a pass JSON object"""
    if config is None:
        config = load_current_config()
    
    # Apply colors - use black as default if null
    pass_json['backgroundColor'] = config.get('backgroundColor') or 'rgb(0, 0, 0)'
    pass_json['foregroundColor'] = config.get('foregroundColor') or 'rgb(255, 255, 255)'
    pass_json['labelColor'] = config.get('labelColor') or 'rgb(255, 255, 255)'
    
    return pass_json

def copy_custom_assets_to_pass(pass_folder, config=None):
    """Copy custom assets with retina variants to a pass folder"""
    if config is None:
        config = load_current_config()
    
    upload_path = ensure_upload_folder()
    
    # Copy custom assets if they exist (base resolution and retina variants)
    for asset_type in ['logo', 'strip', 'background']:
        if config.get(asset_type) and config.get(asset_type) != 'null':
            # Copy base resolution
            src_file = os.path.join(upload_path, config[asset_type])
            if os.path.exists(src_file):
                target_file = os.path.join(pass_folder, f'{asset_type}.png')
                try:
                    shutil.copy(src_file, target_file)
                    print(f"✅ Custom {asset_type} copied to {pass_folder}")
                    
                    # Copy retina variants (@2x, @3x)
                    base_name = os.path.splitext(src_file)[0]
                    for variant in ['@2x', '@3x']:
                        variant_src = f"{base_name}{variant}.png"
                        variant_dst = os.path.join(pass_folder, f"{asset_type}{variant}.png")
                        if os.path.exists(variant_src):
                            shutil.copy(variant_src, variant_dst)
                            print(f"✅ Custom {asset_type}{variant} copied to {pass_folder}")
                            
                except Exception as e:
                    print(f"❌ Error copying {asset_type}: {e}")
        elif asset_type == 'background':
            print(f"⚪ Skipping {asset_type} - not uploaded or is null")
    
    # Also copy icon and its variants if they exist in wallettest
    icon_path = os.path.join(BASE_DIR, 'wallettest', 'icon.png')
    if os.path.exists(icon_path):
        # Copy main icon
        shutil.copy(icon_path, os.path.join(pass_folder, 'icon.png'))
        # Copy as icon@2x.png (required by Apple Wallet)
        shutil.copy(icon_path, os.path.join(pass_folder, 'icon@2x.png'))
        # Copy @3x if it exists
        icon_3x_path = os.path.join(BASE_DIR, 'wallettest', 'icon@3x.png')
        if os.path.exists(icon_3x_path):
            shutil.copy(icon_3x_path, os.path.join(pass_folder, 'icon@3x.png'))

if __name__ == '__main__':
    print("🎫 Apple Pass Customizer Server")
    print(f"📁 Upload folder: {os.path.join(BASE_DIR, UPLOAD_FOLDER)}")
    print("🌐 Starting server at http://localhost:5001")
    print("📝 Visit http://localhost:5001 to customize your passes")
    
    ensure_upload_folder()
    app.run(host='0.0.0.0', port=5001, debug=True)