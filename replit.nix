{pkgs}: {
  deps = [
    pkgs.util-linux
    pkgs.google-cloud-sdk
    pkgs.nodejs
    pkgs.nodePackages.typescript-language-server
    pkgs.postgresql
  ];
}
