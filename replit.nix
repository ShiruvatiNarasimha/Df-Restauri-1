{pkgs}: {
  deps = [
    pkgs.nettools
    pkgs.imagemagick
    pkgs.vips
    pkgs.google-cloud-sdk
    pkgs.nodejs
    pkgs.nodePackages.typescript-language-server
    pkgs.postgresql
  ];
}
