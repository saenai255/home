#!/bin/bash

cd ~
sudo pacman -Syu
sudo pacman -S --sudoloop --noconfirm  go bitwarden zsh xorg gnome nvidia nvidia-utils nvidia-settings nano clang base-devel git make geary virtualbox virtmanager curl discord docker neofetch
mkdir -p Lib
cd Lib
git clone https://aur.archlinux.org/yay.git
cd yay && makepkg -si
cd ~

sudo pacman -R --noconfirm gnome-software
yay -S --sudoloop --noconfirm oh-my-zsh-git brave-git github-desktop pamac-aur archlinux-appstream-data-pamac gnome-tweaks visual-studio-code-bin volta-bin chrome-gnome-shell
