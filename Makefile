
all:
	@./run.sh 1 middleware 50
	@./run.sh 5 middleware 50
	@./run.sh 10 middleware 50
	@./run.sh 15 middleware 50
	@./run.sh 20 middleware 50
	@./run.sh 30 middleware 50
	@./run.sh 50 middleware 50
	@./run.sh 100 middleware 50
	@./run.sh 10 middleware 100
	@./run.sh 10 middleware 250
	@./run.sh 10 middleware 500
	@./run.sh 10 middleware 1000
	@echo

.PHONY: all
