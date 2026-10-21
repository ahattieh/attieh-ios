Pod::Spec.new do |s|
  s.name = 'AttiehPlayer'
  s.version = '1.0.0'
  s.summary = 'Native VLC player for Attieh'
  s.license = { :type => 'Proprietary', :text => 'Ahmad Attieh' }
  s.homepage = 'https://example.invalid/attieh'
  s.author = 'Ahmad Attieh'
  s.source = { :git => 'https://example.invalid/attieh.git', :tag => s.version.to_s }
  s.source_files = 'ios/Plugin/**/*.{swift,h,m}'
  s.ios.deployment_target = '13.0'
  s.dependency 'Capacitor'
  s.dependency 'MobileVLCKit', '~> 3.6.0'
  s.swift_version = '5.1'
  s.static_framework = true
end
