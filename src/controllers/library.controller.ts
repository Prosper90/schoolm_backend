import { Response } from "express";
import { AuthRequest } from "../types";
import prisma from "../config/database";

export const addBook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      author,
      isbn,
      publisher,
      category,
      quantity,
    } = req.body;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.body.schoolId
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const book = await prisma.book.create({
      data: {
        title,
        author,
        isbn,
        publisher,
        category,
        quantity: parseInt(quantity),
        available: parseInt(quantity),
        schoolId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Book added successfully",
      data: book,
    });
  } catch (error) {
    console.error("Add book error:", error);
    res.status(500).json({ message: "Failed to add book" });
  }
};

export const getAllBooks = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "10", search, category } = req.query;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { schoolId };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { author: { contains: search as string, mode: "insensitive" } },
        { isbn: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          _count: {
            select: { issues: true },
          },
        },
        orderBy: { title: "asc" },
      }),
      prisma.book.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        books,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error("Get books error:", error);
    res.status(500).json({ message: "Failed to fetch books" });
  }
};

export const getBookById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        issues: {
          orderBy: { issueDate: "desc" },
          take: 10,
        },
      },
    });

    if (!book) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    console.error("Get book error:", error);
    res.status(500).json({ message: "Failed to fetch book" });
  }
};

export const updateBook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      author,
      isbn,
      publisher,
      category,
      quantity,
    } = req.body;

    // Get current book to calculate available quantity adjustment
    const currentBook = await prisma.book.findUnique({
      where: { id },
    });

    if (!currentBook) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    let newAvailable = currentBook.available;

    // If quantity is being updated, adjust available quantity
    if (quantity !== undefined) {
      const quantityDiff = parseInt(quantity) - currentBook.quantity;
      newAvailable = currentBook.available + quantityDiff;

      if (newAvailable < 0) {
        res.status(400).json({
          message: "Cannot reduce quantity below currently issued books",
        });
        return;
      }
    }

    const book = await prisma.book.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(author && { author }),
        ...(isbn && { isbn }),
        ...(publisher !== undefined && { publisher }),
        ...(category && { category }),
        ...(quantity !== undefined && {
          quantity: parseInt(quantity),
          available: newAvailable,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Book updated successfully",
      data: book,
    });
  } catch (error) {
    console.error("Update book error:", error);
    res.status(500).json({ message: "Failed to update book" });
  }
};

export const deleteBook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check for active issues
    const activeIssuesCount = await prisma.bookIssue.count({
      where: {
        bookId: id,
        returnDate: null,
      },
    });

    if (activeIssuesCount > 0) {
      res.status(400).json({
        message: "Cannot delete book with active issues",
      });
      return;
    }

    await prisma.book.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error("Delete book error:", error);
    res.status(500).json({ message: "Failed to delete book" });
  }
};

export const issueBook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { bookId, userId, dueDate } = req.body;

    // Check book availability
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    if (book.available <= 0) {
      res.status(400).json({ message: "Book is not available for issue" });
      return;
    }

    // Check if user already has this book
    const existingIssue = await prisma.bookIssue.findFirst({
      where: {
        bookId,
        userId,
        returnDate: null,
      },
    });

    if (existingIssue) {
      res.status(400).json({
        message: "User already has this book issued",
      });
      return;
    }

    // Issue book and update available quantity
    const issue = await prisma.$transaction(async (tx) => {
      const newIssue = await tx.bookIssue.create({
        data: {
          bookId,
          userId,
          issueDate: new Date(),
          dueDate: new Date(dueDate),
        },
        include: {
          book: true,
        },
      });

      await tx.book.update({
        where: { id: bookId },
        data: {
          available: {
            decrement: 1,
          },
        },
      });

      return newIssue;
    });

    res.status(201).json({
      success: true,
      message: "Book issued successfully",
      data: issue,
    });
  } catch (error) {
    console.error("Issue book error:", error);
    res.status(500).json({ message: "Failed to issue book" });
  }
};

export const returnBook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { fine } = req.body;

    const issue = await prisma.bookIssue.findUnique({
      where: { id },
      include: { book: true },
    });

    if (!issue) {
      res.status(404).json({ message: "Book issue record not found" });
      return;
    }

    if (issue.returnDate) {
      res.status(400).json({ message: "Book already returned" });
      return;
    }

    // Return book and update available quantity
    const returnedIssue = await prisma.$transaction(async (tx) => {
      const updated = await tx.bookIssue.update({
        where: { id },
        data: {
          returnDate: new Date(),
          status: "RETURNED",
          ...(fine !== undefined && { fine: parseFloat(fine) }),
        },
        include: {
          book: true,
        },
      });

      await tx.book.update({
        where: { id: issue.bookId },
        data: {
          available: {
            increment: 1,
          },
        },
      });

      return updated;
    });

    res.status(200).json({
      success: true,
      message: "Book returned successfully",
      data: returnedIssue,
    });
  } catch (error) {
    console.error("Return book error:", error);
    res.status(500).json({ message: "Failed to return book" });
  }
};

export const getAllBookIssues = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "10", userId, bookId, status } = req.query;

    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      book: {
        schoolId,
      },
    };

    if (userId) {
      where.userId = userId;
    }

    if (bookId) {
      where.bookId = bookId;
    }

    if (status === "issued") {
      where.returnDate = null;
    } else if (status === "returned") {
      where.returnDate = { not: null };
    }

    const [issues, total] = await Promise.all([
      prisma.bookIssue.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          book: true,
        },
        orderBy: { issueDate: "desc" },
      }),
      prisma.bookIssue.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        issues,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    console.error("Get book issues error:", error);
    res.status(500).json({ message: "Failed to fetch book issues" });
  }
};

export const getStudentBookIssues = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const issues = await prisma.bookIssue.findMany({
      where: { userId },
      include: {
        book: true,
      },
      orderBy: { issueDate: "desc" },
    });

    const activeIssues = issues.filter((i) => !i.returnDate);
    const returnedIssues = issues.filter((i) => i.returnDate);

    res.status(200).json({
      success: true,
      data: {
        activeIssues,
        returnedIssues,
        statistics: {
          totalIssued: issues.length,
          currentlyIssued: activeIssues.length,
          returned: returnedIssues.length,
        },
      },
    });
  } catch (error) {
    console.error("Get student book issues error:", error);
    res.status(500).json({ message: "Failed to fetch student book issues" });
  }
};

export const getLibraryReport = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const schoolId = req.user?.role === "SUPER_ADMIN"
      ? req.query.schoolId as string
      : req.user?.schoolId;

    if (!schoolId) {
      res.status(400).json({ message: "School ID is required" });
      return;
    }

    // Get book statistics
    const [totalBooks, totalIssued, overdueIssues, popularBooks] = await Promise.all([
      prisma.book.aggregate({
        where: { schoolId },
        _sum: {
          quantity: true,
          available: true,
        },
        _count: true,
      }),
      prisma.bookIssue.count({
        where: {
          book: { schoolId },
          returnDate: null,
        },
      }),
      prisma.bookIssue.count({
        where: {
          book: { schoolId },
          returnDate: null,
          dueDate: {
            lt: new Date(),
          },
        },
      }),
      prisma.bookIssue.groupBy({
        by: ["bookId"],
        where: { book: { schoolId } },
        _count: true,
        orderBy: {
          _count: {
            bookId: "desc",
          },
        },
        take: 10,
      }),
    ]);

    // Get book details for popular books
    const bookIds = popularBooks.map((pb) => pb.bookId);
    const books = await prisma.book.findMany({
      where: {
        id: { in: bookIds },
      },
    });

    const popularBooksWithDetails = popularBooks.map((pb) => {
      const book = books.find((b) => b.id === pb.bookId);
      return {
        bookId: pb.bookId,
        title: book?.title || "Unknown",
        author: book?.author,
        timesIssued: pb._count,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalBooks: totalBooks._count,
          totalQuantity: totalBooks._sum?.quantity || 0,
          availableBooks: totalBooks._sum?.available || 0,
          currentlyIssued: totalIssued,
          overdueBooks: overdueIssues,
        },
        popularBooks: popularBooksWithDetails,
      },
    });
  } catch (error) {
    console.error("Get library report error:", error);
    res.status(500).json({ message: "Failed to generate library report" });
  }
};
