#
# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: brad@reciprocitylabs.com
# Maintained By: brad@reciprocitylabs.com
#

# NOTE: The following commands *must* be run from the `src/ggrc` directory.
#   Paths are relative to that directory.
#
# Compile SCSS assets using:
# ..
#   compass compile -c assets/compass.config.rb
#
# Auto-generate SCSS assets using:
# ..
#   compass watch -c assets/compass.config.rb

# cache inside the VM, to not overload the host's filesystem - http://stackoverflow.com/questions/19124367/rails-app-on-percise32-vagrant-box-assets-get-text-file-busy-error-errnoe
cache_path = "/tmp/.sass-cache"

sass_options = {
  :debug_info => true,
  }

output_style = (environment == :production) ? :compressed : :expanded
additional_import_paths = [
  "assets/stylesheets",
  "assets/vendor/bootstrap-sass/vendor/assets/stylesheets",
  ]

sass_dir = "assets/stylesheets"
css_dir = "assets/stylesheets"

images_dir = "static/images"

asset_cache_buster do |path, real_path|
  if File.exists?(real_path)
    pathname = Pathname.new(path)
    require 'digest/md5'
    digest = Digest::MD5.hexdigest(real_path.read)
    "%s/%s-%s%s" % [
      pathname.dirname,
      pathname.basename(pathname.extname),
      digest,
      pathname.extname
    ]
  end
end

on_stylesheet_saved do |filename|
  puts "Generated #{filename}"
end
