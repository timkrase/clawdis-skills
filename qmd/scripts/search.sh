#!/bin/bash
# QMD search wrapper - automatically sets PATH and searches vault

export PATH="$HOME/.bun/bin:$PATH"

MODE="${1:-search}"
shift

case "$MODE" in
  search|s)
    qmd search "$@"
    ;;
  vsearch|v)
    qmd vsearch "$@"
    ;;
  query|q)
    qmd query "$@"
    ;;
  get|g)
    qmd get "$@"
    ;;
  list|ls)
    qmd ls vault "$@"
    ;;
  status)
    qmd status
    ;;
  update)
    qmd update "$@"
    ;;
  embed)
    qmd embed "$@"
    ;;
  *)
    echo "Usage: search.sh <mode> [args]"
    echo "Modes: search, vsearch, query, get, list, status, update, embed"
    exit 1
    ;;
esac
