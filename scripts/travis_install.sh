#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

npm install
wget https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh;
bash miniconda.sh -b -p $HOME/miniconda
export PATH="$HOME/miniconda/bin:$PATH"
hash -r
conda config --set always_yes yes --set changeps1 no
conda update -q conda
conda info -a
conda install jupyter nose
conda install -c conda-forge notebook

# create jupyter base dir (needed for config retreival)
mkdir ~/.jupyter


# Install and enable the server extension
pip install -v -e .
jupyter serverextension enable --py jupyterlab
