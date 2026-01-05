import React, { useEffect, useRef, useState, useMemo } from "react";
import { Chess as ChessInstance, PieceSymbol } from "chess.ts";
import { Chessboard, ClearPremoves } from "@/components/chess/chess";
import { Square } from "@/components/chess/chessBoard/types";
import { toast } from "sonner";
import { GameState } from "@/lib/chess-types";
import ChessPlayerProfile from "./chessPlayerProfile";
import OpponentProfile from "./opponentProfile";
import { User } from "@/lib/user-types";
import { authClient } from "@/lib/auth-client";
import { getUser } from "@/actions/userActions";
import { Loader2 } from "lucide-react";
import { getChessComUserStats } from "@/actions/getChessComUserData";
import { getLichessUserStats } from "@/actions/getLichessUserData";

type Props = {
  sendMove: (move: { from: string; to: string; promotion?: string }) => void;
  gameState: GameState | null;
};

export const ClickToMove = ({ sendMove, gameState }: Props) => {
  const chessboardRef = useRef<ClearPremoves>(null);
  // Local state is used only for move options and UI highlighting.
  // The authoritative board state comes from the server.
  const [game, setGame] = useState(new ChessInstance());
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState<Square | null>(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [rightClickedSquares, setRightClickedSquares] = useState<
    Record<string, any>
  >({});
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});
  const [userData, setUserData] = useState<User>();
  const [userId, setUserId] = useState("");
  const [elo, setElo] = useState("1000");

  // Update local game state when the server sends a new game state.

  const playSound = (filename: string) => {
    try {
      console.log(`playing ${filename}`);
      const audio = new Audio(`/chess-sounds/standard/${filename}.mp3`);
      audio.play();
    } catch (err) {
      console.error("could not play sounds");
    }
  };

  // Fetch user data
  useEffect(() => {
    const getUserData = async () => {
      try {
        const user = await authClient.getSession();
        const userData = await getUser(user.data.user.id);

        if (typeof userData == "string" || userData instanceof String) {
          toast.error(userData);
          return;
        }

        if (userData.country && userData.country.length > 0) {
          try {
            const res = await fetch(userData.country);
            const flagData = await res.json();
            const flagCode = flagData.code;
            userData.flagCode = flagCode;
          } catch (error) {
            console.error("Error fetching country flag:", error);
          }
        }

        try {
          if (userData.chessPlatform === "lichess") {
            const response = await getLichessUserStats(userData.chessUsername);

            if (typeof response == "string" || response instanceof String) {
              console.error("Lichess API error:", response);
              toast.error(`Lichess API: ${response}`);
              setElo("1500"); // Default rating
            } else {
              // Check if there was an error but we got a fallback rating
              if (response.error) {
                console.warn("Lichess API warning:", response.error);
                toast.warning(`Lichess API: ${response.error}`);
              }
              setElo(response.perfs.rapid.rating);
            }
          } else if (userData.chessPlatform === "chess.com") {
            const response = await getChessComUserStats(userData.chessUsername);

            if (typeof response == "string" || response instanceof String) {
              console.error("Chess.com API error:", response);
              toast.error(`Chess.com API: ${response}`);
              setElo("1500"); // Default rating
            } else {
              // Check if there was an error but we got a fallback rating
              if (response.error) {
                console.warn("Chess.com API warning:", response.error);
                toast.warning(`Chess.com API: ${response.error}`);
              }
              setElo(response.chess_rapid.last.rating);
            }
          } else {
            // No chess platform specified, use default rating
            setElo("1500");
          }
        } catch (error) {
          console.error("Error fetching chess platform stats:", error);
          toast.error("Could not fetch rating information. Using default rating.");
          setElo("1500"); // Default rating if all else fails
        }

        setUserData(userData);
        setUserId(userData.id);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load user data");
      }
    };

    getUserData();
  }, []);

  // Update local game state when server state changes
  useEffect(() => {
    if (!gameState?.board) return;

    // Defensive check: Ensure gameState.board is a string (i.e. a valid FEN)
    if (typeof gameState.board !== "string") {
      console.warn("Expected gameState.board to be a FEN string, but got:", gameState.board);
      return;
    }

    const newGame = new ChessInstance();
    try {
      // Load the FEN position
      newGame.load(gameState.board);

      // Check game state and play appropriate sounds
      if (gameState.status === "checkmate") {
        // Don't play sound here - it's handled in the useWebSocket hook
      } else if (newGame.inCheck()) {
        playSound("move-check");
        toast.warning("Check!");
      }

      // Update the local game instance
      setGame(newGame);

      // Reset move selection when board updates
      setMoveFrom("");
      setMoveTo(null);
      setOptionSquares({});
      setShowPromotionDialog(false);

    } catch (err) {
      console.error("Failed to load FEN:", gameState.board, err);
    }
  }, [gameState?.board, gameState?.status]);

  function getMoveOptions(square: string) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, any> = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) &&
          game.get(move.to).color !== game.get(square)?.color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });
    newSquares[square] = { background: "rgba(255, 255, 0, 0.4)" };
    setOptionSquares(newSquares);
    return true;
  }

  function onSquareClick(square: Square) {
    if (!gameState) {
      console.log("No game state available");
      return;
    }

    // Log the game state status to help diagnose issues
    console.log(`Game status when clicking square: ${gameState.status}`);

    // Don't allow moves if game is over
    if (gameState.status !== "ongoing") {
      console.log(`Game is over with status: ${gameState.status}`);
      toast.error("Game is already over");
      return;
    }

    // Clear right-clicked squares
    setRightClickedSquares({});

    // Check if it's the player's turn
    const currentTurn = gameState.turn; // "w" or "b"
    const playerColor =
      gameState.playerColors.white === userId ? "w" :
      gameState.playerColors.black === userId ? "b" :
      undefined;

    if (playerColor !== currentTurn) {
      // Only show this error when trying to move a piece of your color
      const pieceOnSquare = game.get(square);
      if (pieceOnSquare && pieceOnSquare.color === playerColor && !moveFrom) {
        playSound("illegal");
        toast.error("It's not your turn!");
        return;
      }
    }

    // If no square is selected yet, show move options
    if (!moveFrom) {
      // Only allow selecting pieces of the player's color
      const pieceOnSquare = game.get(square);
      if (!pieceOnSquare || pieceOnSquare.color !== playerColor) {
        return;
      }

      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    // If a square is already selected, try to move
    const moves = game.moves({ square: moveFrom, verbose: true });
    const foundMove = moves.find((m) => m.from === moveFrom && m.to === square);

    // If the target square is not a valid move, select a new square instead
    if (!foundMove) {
      const hasMoveOptions = getMoveOptions(square);
      setMoveFrom(hasMoveOptions ? square : "");
      return;
    }

    // Set the target square
    setMoveTo(square);

    // Check for pawn promotion
    if (
      (foundMove.color === "w" && foundMove.piece === "p" && square[1] === "8") ||
      (foundMove.color === "b" && foundMove.piece === "p" && square[1] === "1")
    ) {
      setShowPromotionDialog(true);
      return;
    }

    // Create a new game instance for optimistic update
    const newGame = new ChessInstance(game.fen());

    // Try to make the move locally
    try {
      const moveResult = newGame.move({
        from: moveFrom,
        to: square,
      });

      if (moveResult) {
        // Optimistic update - update the local game state immediately
        setGame(newGame);

        // Play move sound immediately
        playSound("move-self");

        // If the move results in check, play check sound
        if (newGame.inCheck()) {
          playSound("move-check");
        }
      }
    } catch (error) {
      console.error("Invalid move:", error);
      // If local validation fails, we'll let the server handle it
    }

    // Send the move to the server
    sendMove({ from: moveFrom, to: square });

    // Reset UI state
    setMoveFrom("");
    setMoveTo(null);
    setOptionSquares({});
  }

  function onPromotionPieceSelect(piece: string) {
    if (piece && moveTo) {
      const promotionPiece = piece[1]?.toLowerCase() || "q";
      const movePayload = {
        from: moveFrom,
        to: moveTo,
        promotion: promotionPiece,
      };

      // Create a new game instance for optimistic update
      const newGame = new ChessInstance(game.fen());

      // Try to make the promotion move locally
      try {
        const moveResult = newGame.move({
          from: moveFrom,
          to: moveTo,
          promotion: promotionPiece as PieceSymbol,
        });

        if (moveResult) {
          // Optimistic update - update the local game state immediately
          setGame(newGame);

          // Play promotion sound immediately
          playSound("promote");

          // If the move results in check, play check sound
          if (newGame.inCheck()) {
            playSound("move-check");
          }
        }
      } catch (error) {
        console.error("Invalid promotion move:", error);
        // If local validation fails, we'll let the server handle it
      }

      // Send the move to the server
      sendMove(movePayload);
    }
    // Reset regardless of promotion outcome.
    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);
    setOptionSquares({});
    return true;
  }

  function onSquareRightClick(square: string) {
    const colour = "rgba(0, 0, 255, 0.4)";
    setRightClickedSquares((prev) => ({
      ...prev,
      [square]:
        prev[square] && prev[square].backgroundColor === colour
          ? undefined
          : { backgroundColor: colour },
    }));
  }

  function onDrop(sourceSquare: string, targetSquare: string, piece: string) {
    if (!gameState) {
      console.log("No game state available for drag and drop");
      return false;
    }

    // Log the game state status to help diagnose issues
    console.log(`Game status when dropping piece: ${gameState.status}`);

    // Don't allow moves if game is over
    if (gameState.status !== "ongoing") {
      console.log(`Game is over with status: ${gameState.status}`);
      toast.error("Game is already over");
      return false;
    }

    // Check if it's the player's turn
    const currentTurn = gameState.turn; // "w" or "b"
    const playerColor =
      gameState.playerColors.white === userId ? "w" :
      gameState.playerColors.black === userId ? "b" :
      undefined;

    if (playerColor !== currentTurn) {
      playSound("illegal");
      toast.error("It's not your turn!");
      return false;
    }

    // Check if the piece being moved belongs to the player
    const pieceColor = piece[0].toLowerCase() === "w" ? "w" : "b";
    if (pieceColor !== playerColor) {
      playSound("illegal");
      toast.error("You can only move your own pieces");
      return false;
    }

    // Check if this is a pawn promotion move
    const isPawnPromotion =
      (piece === "wP" && targetSquare[1] === "8") ||
      (piece === "bP" && targetSquare[1] === "1");

    // For pawn promotion, use the promotion dialog
    if (isPawnPromotion) {
      setMoveFrom(sourceSquare);
      setMoveTo(targetSquare as Square);
      setShowPromotionDialog(true);
      return false; // Don't complete the move yet
    }

    // For regular moves, validate locally first
    const movePayload = {
      from: sourceSquare,
      to: targetSquare,
    };

    // Create a new game instance for optimistic update
    const newGame = new ChessInstance(game.fen());

    // Try to make the move locally
    try {
      const moveResult = newGame.move({
        from: sourceSquare,
        to: targetSquare,
      });

      if (moveResult) {
        // Optimistic update - update the local game state immediately
        setGame(newGame);

        // Play move sound immediately
        playSound("move-self");

        // If the move results in check, play check sound
        if (newGame.inCheck()) {
          playSound("move-check");
        }
      }
    } catch (error) {
      console.error("Invalid move:", error);
      // If local validation fails, we'll let the server handle it
    }

    // Send the move to the server
    sendMove(movePayload);

    // Return true to allow the piece to move in the UI
    return true;
  }

  const pieces = [
    "wP",
    "wN",
    "wB",
    "wR",
    "wQ",
    "wK",
    "bP",
    "bN",
    "bB",
    "bR",
    "bQ",
    "bK",
  ];

  const customPieces = useMemo(() => {
    const pieceComponents: Record<
      string,
      React.FC<{ squareWidth: number }>
    > = {};
    pieces.forEach((piece) => {
      pieceComponents[piece] = ({ squareWidth }) => (
        <div
          style={{
            width: squareWidth,
            height: squareWidth,
            backgroundImage: `url(/pieceImages/${piece}.png)`,
            backgroundSize: "100%",
          }}
        />
      );
    });
    return pieceComponents;
  }, []);

  if (!userData) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center flex-col gap-4">
      <div className="w-full flex">
        <OpponentProfile
          userId={
            gameState && gameState.playerColors.white === userId
              ? gameState?.playerColors.black ?? ""
              : gameState?.playerColors.white ?? ""
          }
          playerDetails={
            gameState?.playerDetails && gameState.playerColors.white === userId
              ? gameState.playerDetails.black
              : gameState?.playerDetails?.white
          }
        />
      </div>
      <Chessboard
        id="ClickToMove"
        boardOrientation={
          gameState && gameState.playerColors.white === userId
            ? "white"
            : "black"
        }
        animationDuration={200}
        position={game.fen()}
        onSquareClick={onSquareClick}
        onSquareRightClick={onSquareRightClick}
        onPromotionPieceSelect={onPromotionPieceSelect}
        onPieceDrop={onDrop}
        isDraggablePiece={({ piece }) => true}
        ref={chessboardRef}
        customPieces={customPieces}
        customDarkSquareStyle={{ backgroundColor: "#779952" }}
        customLightSquareStyle={{ backgroundColor: "#edeed1" }}
        customSquareStyles={{
          ...optionSquares,
          ...rightClickedSquares,
        }}
        promotionToSquare={moveTo}
        showPromotionDialog={showPromotionDialog}
        allowDragOutsideBoard={false}
      />
      <div className="w-full flex">
        <ChessPlayerProfile user={userData} Elo={elo} />
      </div>
    </div>
  );
};
